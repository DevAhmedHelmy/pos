mod hardware;

use tauri::Manager;
use tracing_subscriber::{fmt, EnvFilter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            hardware::printer::print_receipt,
            hardware::printer::reprint_receipt,
            hardware::cash_drawer::open_cash_drawer,
            hardware::barcode::start_barcode_listener,
            hardware::barcode::stop_barcode_listener,
            hardware::card_terminal::request_card_payment,
            hardware::card_terminal::cancel_card_payment,
        ])
        .setup(|app| {
            let _app_data = app.path().app_data_dir().expect("app_data_dir unavailable");
            tracing::info!("POS app started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running Tauri application");
}
