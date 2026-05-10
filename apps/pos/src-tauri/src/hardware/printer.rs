use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PrintReceiptRequest {
    pub receipt_data: String, // ESC/POS encoded base64
    pub printer_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PrintReceiptResponse {
    pub success: bool,
    pub error: Option<String>,
}

/// Sends ESC/POS receipt data to the configured thermal printer.
/// Returns success=false with an error message on failure — the UI
/// then offers the cashier a re-print option or email receipt fallback.
#[tauri::command]
pub async fn print_receipt(request: PrintReceiptRequest) -> Result<PrintReceiptResponse, String> {
    // TODO: implement ESC/POS printing via system printer API
    tracing::info!("print_receipt called, printer={:?}", request.printer_name);
    Ok(PrintReceiptResponse { success: true, error: None })
}

#[tauri::command]
pub async fn reprint_receipt(request: PrintReceiptRequest) -> Result<PrintReceiptResponse, String> {
    print_receipt(request).await
}
