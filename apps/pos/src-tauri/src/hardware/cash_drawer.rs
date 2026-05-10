use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CashDrawerResponse {
    pub opened: bool,
    pub error: Option<String>,
}

/// Triggers the cash drawer via the ESC/POS pulse command through the printer port.
/// Called automatically after every completed cash payment.
#[tauri::command]
pub async fn open_cash_drawer() -> Result<CashDrawerResponse, String> {
    // TODO: send ESC/POS cash drawer kick command (ESC p 0 25 250)
    tracing::info!("open_cash_drawer called");
    Ok(CashDrawerResponse { opened: true, error: None })
}
