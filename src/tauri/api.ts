import { invoke } from "@tauri-apps/api/core";

/**
 * The ONLY module that knows about Tauri's invoke(). Everything else talks to
 * the CvRepository interface, so the persistence code can be unit-tested with
 * a fake repository and swapped (e.g. to SQLite) later.
 *
 * Outside the Tauri webview (plain `npm run dev`), file features are off.
 */

export function isTauriAvailable(): boolean {
  return (
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
  );
}

export type PickMode = "open" | "save";

export function pickCvFile(mode: PickMode): Promise<string | null> {
  return invoke<string | null>("pick_cv_file", { mode });
}

export function readCvFile(path: string): Promise<string> {
  return invoke<string>("read_cv_file", { path });
}

export function writeCvFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_cv_file", { path, contents });
}

export function pickTexFile(mode: "save"): Promise<string | null> {
  return invoke<string | null>("pick_tex_file", { mode });
}

export function writeTexFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_tex_file", { path, contents });
}

export function pickPdfFile(): Promise<string | null> {
  return invoke<string | null>("pick_pdf_file");
}

export function exportPdfFile(contents: string, outPath: string): Promise<void> {
  return invoke<void>("export_pdf", { contents, outPath });
}

export function readAutosave(): Promise<string | null> {
  return invoke<string | null>("read_autosave");
}

export function writeAutosave(contents: string): Promise<void> {
  return invoke<void>("write_autosave", { contents });
}

export function clearAutosave(): Promise<void> {
  return invoke<void>("clear_autosave");
}

/** Rust rejects with plain strings; normalize anything thrown to a message. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
