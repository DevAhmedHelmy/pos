# API Contract: Sync Ingestion

**Feature**: 001-core-pos-mvp
**Base URL**: `/api/v1/sync`
**Date**: 2026-05-08

All endpoints require `Authorization: Bearer <accessToken>`.
All responses follow the standard envelope.
All endpoints are idempotent: replaying a request with the same `idempotencyKey`
returns the same response without re-processing.

---

## POST /api/v1/sync/sales

Ingests a completed sale from a POS terminal.

### Request Headers

| Header | Value |
|---|---|
| `Idempotency-Key` | `sale:{localId}:{version}` |

### Request Body

```json
{
  "localId": "uuid",
  "shiftLocalId": "uuid",
  "cashierId": "uuid",
  "warehouseId": "uuid",
  "terminalId": "string",
  "status": "completed",
  "subtotal": "125.000",
  "invoiceDiscount": "10.000",
  "tax": "17.250",
  "total": "132.250",
  "paidCash": "150.000",
  "paidCard": "0.000",
  "changeDue": "17.750",
  "receiptNumber": "WH01-20260508-00042",
  "completedAt": "2026-05-08T10:30:00Z",
  "createdAt": "2026-05-08T10:29:45Z",
  "version": 1,
  "items": [
    {
      "localId": "uuid",
      "snapshot": {
        "barcode": "6281234567890",
        "sku": "PROD-001",
        "nameAr": "زيت دوار الشمس",
        "nameEn": "Sunflower Oil",
        "price": "12.500",
        "taxRate": "0.150",
        "unit": "bottle"
      },
      "quantity": "2.000",
      "unitPrice": "12.500",
      "discount": "0.000",
      "tax": "3.750",
      "lineTotal": "29.250"
    }
  ],
  "payments": [
    {
      "localId": "uuid",
      "method": "cash",
      "amount": "150.000",
      "reference": null
    }
  ]
}
```

### Response 201 — Created

```json
{
  "data": {
    "remoteId": "uuid",
    "receiptNumber": "WH01-20260508-00042",
    "syncedAt": "2026-05-08T10:30:05Z"
  },
  "meta": {},
  "error": null
}
```

### Response 200 — Already processed (idempotent replay)

Same as 201 but with HTTP 200.

### Response 409 — Conflict

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "Sale receipt number already exists with different data",
    "details": { "conflictField": "receiptNumber" }
  }
}
```

---

## POST /api/v1/sync/shifts

Ingests a shift open or close event from a POS terminal.

### Request Headers

| Header | Value |
|---|---|
| `Idempotency-Key` | `shift:{localId}:{version}` |

### Request Body

```json
{
  "localId": "uuid",
  "cashierId": "uuid",
  "warehouseId": "uuid",
  "terminalId": "string",
  "status": "open",
  "openAt": "2026-05-08T08:00:00Z",
  "closeAt": null,
  "openingCash": "500.000",
  "closingCash": null,
  "totalSales": "0.000",
  "totalRefunds": "0.000",
  "totalCash": "0.000",
  "totalCard": "0.000",
  "version": 1
}
```

For shift close, `status = "closed"`, `closeAt` and `closingCash` are populated,
and all totals reflect the completed shift.

### Response 201 — Created / 200 — Updated

```json
{
  "data": {
    "remoteId": "uuid",
    "syncedAt": "2026-05-08T08:00:02Z"
  },
  "meta": {},
  "error": null
}
```

---

## POST /api/v1/sync/refunds

Ingests a refund record from a POS terminal.

### Request Headers

| Header | Value |
|---|---|
| `Idempotency-Key` | `refund:{localId}:{version}` |

### Request Body

```json
{
  "localId": "uuid",
  "originalSaleLocalId": "uuid",
  "originalSaleRemoteId": "uuid",
  "cashierId": "uuid",
  "supervisorId": "uuid",
  "warehouseId": "uuid",
  "terminalId": "string",
  "items": [
    {
      "saleItemId": "uuid",
      "quantity": "1.000",
      "amount": "12.500",
      "reason": "customer_return"
    }
  ],
  "total": "12.500",
  "receiptNumber": "REF-WH01-20260508-00042-001",
  "createdAt": "2026-05-08T11:00:00Z",
  "version": 1
}
```

### Response 201 — Created / 200 — Idempotent

```json
{
  "data": {
    "remoteId": "uuid",
    "syncedAt": "2026-05-08T11:00:05Z"
  },
  "meta": {},
  "error": null
}
```

### Response 422 — Duplicate refund

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "REFUND_ALREADY_PROCESSED",
    "message": "This sale has already been fully refunded"
  }
}
```

---

## POST /api/v1/sync/audit-logs

Ingests a batch of audit log entries from a POS terminal.

### Request Body

```json
{
  "terminalId": "string",
  "warehouseId": "uuid",
  "entries": [
    {
      "localId": "uuid",
      "userId": "uuid",
      "action": "sale_completed",
      "entityType": "sale",
      "entityId": "uuid",
      "beforeState": null,
      "afterState": { "status": "completed", "total": "132.250" },
      "timestamp": "2026-05-08T10:30:00Z"
    }
  ]
}
```

Max batch size: 100 entries per request.

### Response 201

```json
{
  "data": {
    "received": 1,
    "processed": 1,
    "skipped": 0
  },
  "meta": {},
  "error": null
}
```

---

## GET /api/v1/sync/status

Returns the current sync status and any pending conflicts for a terminal.

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `terminalId` | String | Yes | Terminal identifier |
| `warehouseId` | UUID | Yes | Warehouse identifier |

### Response 200

```json
{
  "data": {
    "pendingConflicts": 0,
    "lastSyncAt": "2026-05-08T10:30:05Z",
    "serverTime": "2026-05-08T11:00:00Z"
  },
  "meta": {},
  "error": null
}
```