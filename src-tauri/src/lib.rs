pub mod commands;
pub mod config;
pub mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::VaultState::default())
        .invoke_handler(tauri::generate_handler![
            commands::vault_default_path,
            commands::vault_create,
            commands::vault_open,
            commands::vault_list_known,
            commands::vault_forget,
            commands::vault_delete,
            commands::doc_list,
            commands::doc_read,
            commands::doc_write,
            commands::doc_delete,
            commands::schedule_list,
            commands::schedule_add,
            commands::schedule_update,
            commands::schedule_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
