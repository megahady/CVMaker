//! Filesystem + dialog commands.
//!
//! Security notes:
//! - Paths come from native file dialogs or are validated (`.cv` extension,
//!   no NUL bytes) before any I/O.
//! - The autosave lives in the app data directory, constructed internally —
//!   the frontend can never point it at an arbitrary path.
//! - No shell is ever spawned; no user input becomes a command line.
//!
//! All commands are `async` so blocking dialogs don't run on the main thread
//! and file I/O doesn't block the UI.

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::time::Duration;

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tokio::time::timeout;

const AUTOSAVE_FILE: &str = "autosave.cv";
const PDF_TIMEOUT: Duration = Duration::from_secs(120);

fn validate_extension(path: &str, extension: &str, hint: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("No file path was provided.".to_string());
    }
    if trimmed.contains('\0') {
        return Err("Invalid file path.".to_string());
    }
    let candidate = Path::new(trimmed);
    match candidate.extension().and_then(|ext| ext.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case(extension) => Ok(candidate.to_path_buf()),
        Some(_) => Err(format!("{hint} must use the .{extension} extension.")),
        None => Err(format!("The file name must end with .{extension}.")),
    }
}

fn validate_cv_path(path: &str) -> Result<PathBuf, String> {
    validate_extension(path, "cv", "CVMaker files")
}

fn validate_tex_path(path: &str) -> Result<PathBuf, String> {
    validate_extension(path, "tex", "LaTeX files")
}

fn validate_pdf_path(path: &str) -> Result<PathBuf, String> {
    validate_extension(path, "pdf", "PDF files")
}

fn autosave_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot locate the app data directory: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Cannot create the app data directory: {e}"))?;
    Ok(dir.join(AUTOSAVE_FILE))
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

#[tauri::command]
pub async fn pick_cv_file(app: tauri::AppHandle, mode: String) -> Result<Option<String>, String> {
    let builder = app.dialog().file().add_filter("CVMaker CV", &["cv"]);
    let picked = match mode.as_str() {
        "open" => builder.blocking_pick_file(),
        "save" => builder
            .set_file_name("My Academic CV.cv")
            .blocking_save_file(),
        other => return Err(format!("Unknown dialog mode: {other}")),
    };

    match picked {
        None => Ok(None),
        Some(file_path) => {
            let path = file_path
                .into_path()
                .map_err(|e| format!("Unsupported file path: {e}"))?;
            Ok(Some(path_to_string(path)))
        }
    }
}

#[tauri::command]
pub async fn read_cv_file(path: String) -> Result<String, String> {
    let target = validate_cv_path(&path)?;
    fs::read_to_string(&target)
        .map_err(|e| format!("Could not read {}: {e}", target.display()))
}

#[tauri::command]
pub async fn pick_tex_file(app: tauri::AppHandle, mode: String) -> Result<Option<String>, String> {
    let builder = app.dialog().file().add_filter("LaTeX file", &["tex"]);
    let picked = match mode.as_str() {
        "save" => builder
            .set_file_name("My Academic CV.tex")
            .blocking_save_file(),
        other => return Err(format!("Unknown dialog mode: {other}")),
    };

    match picked {
        None => Ok(None),
        Some(file_path) => {
            let path = file_path
                .into_path()
                .map_err(|e| format!("Unsupported file path: {e}"))?;
            Ok(Some(path_to_string(path)))
        }
    }
}

/// Atomic write for exported .tex files (same safety as .cv saves).
#[tauri::command]
pub async fn write_tex_file(path: String, contents: String) -> Result<(), String> {
    let target = validate_tex_path(&path)?;
    let temp = target.with_extension("tex.tmp");
    fs::write(&temp, &contents)
        .map_err(|e| format!("Could not write {}: {e}", temp.display()))?;
    fs::rename(&temp, &target).map_err(|e| format!("Could not save {}: {e}", target.display()))
}

#[tauri::command]
pub async fn pick_pdf_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("PDF document", &["pdf"])
        .set_file_name("My Academic CV.pdf")
        .blocking_save_file();

    match picked {
        None => Ok(None),
        Some(file_path) => {
            let path = file_path
                .into_path()
                .map_err(|e| format!("Unsupported file path: {e}"))?;
            Ok(Some(path_to_string(path)))
        }
    }
}

fn random_suffix() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_else(|e| e.duration().as_nanos())
        .to_string()
}

fn log_tail(source: &[u8], limit: usize) -> String {
    let text = String::from_utf8_lossy(source);
    let trimmed = text.trim();
    if trimmed.len() <= limit {
        return trimmed.to_string();
    }
    format!("...{}\n\n[truncated {} chars]", &trimmed[trimmed.len() - limit..], trimmed.len() - limit)
}

/// Runs XeLaTeX twice (second pass resolves hyperref page labels/outlines).
/// Arguments are FIXED constants — no user input ever becomes a flag.
async fn run_xelatex(work_dir: &Path) -> Result<(), String> {
    for pass in 0..2 {
        let mut command = tokio::process::Command::new("xelatex");
        command
            .args([
                "-interaction=nonstopmode",
                "-halt-on-error",
                "-output-directory",
            ])
            .arg(work_dir.to_string_lossy().to_string())
            .arg("main.tex")
            .current_dir(work_dir);

        let output = match timeout(PDF_TIMEOUT, command.output()).await {
            Err(_) => return Err("XeLaTeX timed out after 120 seconds.".to_string()),
            Ok(io_result) => io_result.map_err(|e| {
                format!(
                    "Could not start XeLaTeX: {e}. Install MiKTeX or TeX Live and add xelatex to your PATH."
                )
            })?,
        };

        if !output.status.success() {
            let tail = log_tail(&output.stderr, 4000);
            if tail.is_empty() {
                return Err(format!("XeLaTeX failed on pass {}.", pass + 1));
            }
            return Err(tail);
        }
    }
    Ok(())
}

/// Compiles generated .tex content to a PDF at the user-chosen path.
///
/// Pipeline (all inside this command — the frontend never needs a .tex path):
/// write main.tex to a fresh temp dir → xelatex (×2) → copy main.pdf to the
/// destination → delete the temp dir. Temp dir names come from the clock, never
/// from user input, so nothing user-controlled reaches a command line.
#[tauri::command]
pub async fn export_pdf(contents: String, out_path: String) -> Result<(), String> {
    let target = validate_pdf_path(&out_path)?;
    let work_dir = std::env::temp_dir().join(format!("cvmaker-{}", random_suffix()));
    fs::create_dir_all(&work_dir)
        .map_err(|e| format!("Could not create the temp directory: {e}"))?;

    let err = (async || -> Result<(), String> {
        fs::write(work_dir.join("main.tex"), &contents)
            .map_err(|e| format!("Could not write the temporary .tex file: {e}"))?;
        run_xelatex(&work_dir).await?;

        let pdf = work_dir.join("main.pdf");
        if !pdf.exists() {
            return Err("XeLaTeX finished but produced no PDF.".to_string());
        }
        if target.exists() {
            fs::remove_file(&target)
                .map_err(|e| format!("Could not replace {}: {e}", target.display()))?;
        }
        fs::copy(&pdf, &target)
            .map(|_| ())
            .map_err(|e| format!("Could not write {}: {e}", target.display()))
    })()
    .await
    .err();

    let _ = fs::remove_dir_all(&work_dir);
    match err {
        None => Ok(()),
        Some(e) => Err(e),
    }
}

/// Atomic write: contents go to a temp file first, then rename over the
/// target, so a crash mid-write can never corrupt an existing CV.
#[tauri::command]
pub async fn write_cv_file(path: String, contents: String) -> Result<(), String> {
    let target = validate_cv_path(&path)?;
    let temp = target.with_extension("cv.tmp");
    fs::write(&temp, &contents)
        .map_err(|e| format!("Could not write {}: {e}", temp.display()))?;
    fs::rename(&temp, &target).map_err(|e| format!("Could not save {}: {e}", target.display()))
}

#[tauri::command]
pub async fn read_autosave(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = autosave_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("Could not read the autosave file: {e}"))
}

#[tauri::command]
pub async fn write_autosave(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = autosave_path(&app)?;
    fs::write(&path, contents)
        .map_err(|e| format!("Could not write the autosave file: {e}"))
}

#[tauri::command]
pub async fn clear_autosave(app: tauri::AppHandle) -> Result<(), String> {
    let path = autosave_path(&app)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Could not clear the autosave file: {e}")),
    }
}
