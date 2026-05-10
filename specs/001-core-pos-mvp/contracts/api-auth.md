# API Contract: Authentication

**Feature**: 001-core-pos-mvp
**Base URL**: `/api/v1/auth`
**Date**: 2026-05-08

All requests and responses use `Content-Type: application/json`.
All responses follow the standard envelope:

```json
{
  "data": <payload | null>,
  "meta": {},
  "error": <null | { "code": "string", "message": "string", "details": {} }>
}
```

---

## POST /api/v1/auth/login

Authenticates a cashier or supervisor and returns JWT tokens.

### Request

```json
{
  "username": "string",
  "pin": "string"
}
```

| Field | Type | Constraints |
|---|---|---|
| `username` | String | Required, 2–50 chars |
| `pin` | String | Required, exactly 4 digits |

### Response 200 — Success

```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "username": "cashier01",
      "nameAr": "أحمد",
      "nameEn": "Ahmed",
      "role": "cashier",
      "warehouseId": "uuid"
    }
  },
  "meta": {},
  "error": null
}
```

| Field | Description |
|---|---|
| `accessToken` | JWT, 15-minute TTL, contains `userId`, `role`, `warehouseId` |
| `refreshToken` | JWT, 7-day TTL, single-use |
| `expiresIn` | Access token TTL in seconds (900) |

### Response 401 — Invalid credentials

```json
{
  "data": null,
  "meta": {},
  "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "Invalid username or PIN" }
}
```

### Response 403 — Inactive user

```json
{
  "data": null,
  "meta": {},
  "error": { "code": "AUTH_USER_INACTIVE", "message": "Account is deactivated" }
}
```

---

## POST /api/v1/auth/refresh

Exchanges a valid refresh token for a new access token + refresh token pair
(refresh token rotation).

### Request

```json
{
  "refreshToken": "eyJhbGci..."
}
```

### Response 200 — Success

Same structure as login `data` object.

### Response 401 — Expired or invalid refresh token

```json
{
  "data": null,
  "meta": {},
  "error": { "code": "AUTH_TOKEN_INVALID", "message": "Refresh token is invalid or expired" }
}
```

---

## POST /api/v1/auth/logout

Revokes the current refresh token. Fire-and-forget from the POS perspective.

### Request

Headers: `Authorization: Bearer <accessToken>`

```json
{
  "refreshToken": "eyJhbGci..."
}
```

### Response 200

```json
{ "data": { "revoked": true }, "meta": {}, "error": null }
```

---

## POST /api/v1/auth/verify-pin

Used during supervisor PIN elevation flow. Verifies a supervisor PIN against the
cloud store (when online). The POS also performs local verification against the
cached PIN hash; this endpoint is the authoritative fallback.

### Request

Headers: `Authorization: Bearer <accessToken>`

```json
{
  "supervisorUsername": "string",
  "pin": "string"
}
```

### Response 200 — PIN verified

```json
{
  "data": {
    "verified": true,
    "supervisorId": "uuid",
    "role": "supervisor"
  },
  "meta": {},
  "error": null
}
```

### Response 401 — PIN incorrect or insufficient role

```json
{
  "data": null,
  "meta": {},
  "error": { "code": "AUTH_PIN_INVALID", "message": "Supervisor PIN is incorrect" }
}
```

---

## Security Notes

- Access tokens carry claims: `{ sub: userId, role, warehouseId, terminalId }`
- Refresh tokens are stored in a Redis SET for revocation checking
- Rate limiting: 5 failed login attempts per username per 5 minutes → temporary lockout
- All auth endpoints are on the public routes whitelist (no Bearer required)
- All other API endpoints require `Authorization: Bearer <accessToken>`