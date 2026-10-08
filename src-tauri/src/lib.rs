mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::pick_cv_file,
            commands::read_cv_file,
            commands::write_cv_file,
            commands::pick_tex_file,
            commands::write_tex_file,
            commands::pick_pdf_file,
            commands::export_pdf,
            commands::read_autosave,
            commands::write_autosave,
            commands::clear_autosave,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
