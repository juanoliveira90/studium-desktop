pub mod commands;
pub mod config;
pub mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(commands::VaultState::default())
        .invoke_handler(tauri::generate_handler![
            commands::vault_default_path,
            commands::vault_create,
            commands::vault_open,
            commands::doc_list,
            commands::doc_read,
            commands::doc_write,
            commands::schedule_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
