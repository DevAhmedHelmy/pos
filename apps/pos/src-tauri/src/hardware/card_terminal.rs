use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CardPaymentRequest {
    pub amount_cents: u64, // amount in smallest currency unit (halala/fils/cents)
    pub currency: String,
    pub reference: String,
}

#[derive(Debug, Serialize)]
pub struct CardPaymentResponse {
    pub approved: bool,
    pub approval_code: Option<String>,
    pub error: Option<String>,
}

/// Initiates a card payment request on the connected card terminal.
/// Blocks until the terminal responds (approval or decline).
/// On terminal disconnection or timeout, returns approved=false with an error.
#[tauri::command]
pub async fn request_card_payment(
    request: CardPaymentRequest,
) -> Result<CardPaymentResponse, String> {
    // TODO: implement card terminal SDK integration (vendor-specific)
    tracing::info!(
        "request_card_payment: {} {} ref={}",
        request.amount_cents,
        request.currency,
        request.reference
    );
    Ok(CardPaymentResponse { approved: false, approval_code: None, error: Some("Not implemented".to_string()) })
}

#[tauri::command]
pub async fn cancel_card_payment() -> Result<bool, String> {
    tracing::info!("cancel_card_payment called");
    Ok(true)
}
