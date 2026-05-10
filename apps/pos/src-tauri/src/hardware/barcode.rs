use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct BarcodeListenerResponse {
    pub active: bool,
}

/// Starts the barcode scanner listener.
/// Scanned codes are emitted as Tauri events ("barcode-scanned") to the frontend.
/// The scanner acts as an HID keyboard device — keystrokes are captured and
/// assembled into barcode strings terminated by Enter.
#[tauri::command]
pub async fn start_barcode_listener() -> Result<BarcodeListenerResponse, String> {
    // TODO: implement HID keyboard capture for barcode scanner
    tracing::info!("start_barcode_listener called");
    Ok(BarcodeListenerResponse { active: true })
}

#[tauri::command]
pub async fn stop_barcode_listener() -> Result<BarcodeListenerResponse, String> {
    tracing::info!("stop_barcode_listener called");
    Ok(BarcodeListenerResponse { active: false })
}
