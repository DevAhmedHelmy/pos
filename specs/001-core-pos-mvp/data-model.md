# Data Model: Core POS MVP

**Feature**: 001-core-pos-mvp
**Date**: 2026-05-08

This document defines all entities, their fields, validation rules, relationships,
and state transitions for the Core POS MVP.

---

## Sync Metadata Convention

Every entity that is synchronized between the local POS and the cloud carries these
fields. They are omitted from individual entity descriptions below for brevity but
are REQUIRED on all synced entities.

| Field | Type | Description |
|---|---|---|
| `localId` | UUID | Device-scoped primary key, generated locally |
| `remoteId` | UUID? | Cloud-assigned ID, null until first successful sync |
| `syncStatus` | Enum | `pending` \| `synced` \| `conflict` \| `error` |
| `syncedAt` | DateTime? | Timestamp of last successful sync |
| `version` | Int | Optimistic locking counter, increments on each local update |

---

## Entity: Product

**Scope**: Local SQLite (read-only from POS), Cloud PostgreSQL (writable via admin)
**Sync direction**: Cloud → Local (catalog push only; POS never writes products)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | Sync metadata |
| `barcode` | String | UNIQUE, NOT NULL | Primary scan key |
| `sku` | String | UNIQUE, NOT NULL | Alternative lookup key |
| `nameAr` | String | NOT NULL | Arabic name (primary) |
| `nameEn` | String | NOT NULL | English name |
| `price` | Decimal | NOT NULL, ≥ 0 | Selling price in local currency |
| `taxRate` | Decimal | NOT NULL, 0–1 | e.g., 0.15 = 15% |
| `unit` | String | NOT NULL | e.g., "pcs", "kg", "litre" |
| `warehouseId` | UUID | NOT NULL, FK → Warehouse | Multi-warehouse from day one |
| `isActive` | Boolean | NOT NULL, DEFAULT true | Inactive products excluded from POS search |
| `updatedAt` | DateTime | NOT NULL | Used for conflict resolution |

**Indexes**: `barcode` (unique), `sku` (unique), `nameAr` (FTS5), `nameEn` (FTS5),
`warehouseId`, `isActive`

**Validation rules**:
- `barcode` MUST match a valid EAN-8, EAN-13, or Code-128 pattern, or a custom internal format
- `price` MUST be a non-negative decimal with at most 4 decimal places
- `taxRate` MUST be between 0.00 and 1.00 inclusive

---

## Entity: Shift

**Scope**: Local SQLite + Cloud PostgreSQL
**Sync direction**: Bidirectional (local creates, cloud stores)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `cashierId` | UUID | NOT NULL | FK → User (locally cached) |
| `terminalId` | String | NOT NULL | Device identifier |
| `warehouseId` | UUID | NOT NULL | |
| `status` | Enum | NOT NULL | `open` \| `closed` |
| `openAt` | DateTime | NOT NULL | Set at shift open |
| `closeAt` | DateTime? | Null until closed | Set at shift close |
| `openingCash` | Decimal | NOT NULL, ≥ 0 | Declared at shift open |
| `closingCash` | Decimal? | Null until closed | Actual cash counted at close |
| `totalSales` | Decimal | DEFAULT 0 | Accumulated on sale completion |
| `totalRefunds` | Decimal | DEFAULT 0 | Accumulated on refund |
| `totalCash` | Decimal | DEFAULT 0 | Cash received during shift |
| `totalCard` | Decimal | DEFAULT 0 | Card received during shift |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | |
| `updatedAt` | DateTime | NOT NULL | |

**State transitions**:
```
open → closed (one-way, irreversible)
```

**Business rules**:
- Only one shift with `status = 'open'` is permitted per `terminalId`
- `closeAt` MUST be set when status transitions to `closed`
- Totals are accumulated as sales complete; they are denormalized for fast shift summary

---

## Entity: Sale

**Scope**: Local SQLite + Cloud PostgreSQL
**Sync direction**: Local creates → Cloud receives

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `shiftId` | UUID | NOT NULL | FK → Shift |
| `cashierId` | UUID | NOT NULL | FK → User |
| `warehouseId` | UUID | NOT NULL | |
| `status` | Enum | NOT NULL | `draft` \| `held` \| `completed` \| `cancelled` \| `refunded` |
| `subtotal` | Decimal | NOT NULL, ≥ 0 | Sum of line totals before invoice discount |
| `invoiceDiscount` | Decimal | NOT NULL, DEFAULT 0 | Invoice-level discount amount |
| `tax` | Decimal | NOT NULL, DEFAULT 0 | Total tax calculated from item tax rates |
| `total` | Decimal | NOT NULL, ≥ 0 | Final payable: subtotal - invoiceDiscount + tax |
| `paidCash` | Decimal | NOT NULL, DEFAULT 0 | Cash received |
| `paidCard` | Decimal | NOT NULL, DEFAULT 0 | Card received |
| `changeDue` | Decimal | NOT NULL, DEFAULT 0 | Change returned to customer |
| `holdRef` | String? | Null unless held | Human-readable hold reference (e.g., "H-001") |
| `receiptNumber` | String? | UNIQUE, null until completed | Auto-generated on completion |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | |
| `completedAt` | DateTime? | Null until completed | |
| `cancelledAt` | DateTime? | Null until cancelled | |
| `updatedAt` | DateTime | NOT NULL | |

**Indexes**: `shiftId`, `status`, `receiptNumber` (unique), `cashierId`, `syncStatus`

**State transitions**:
```
draft → completed  (payment confirmed)
draft → held       (cashier holds)
draft → cancelled  (cashier cancels, with confirmation)
held  → draft      (cashier resumes)
completed → refunded  (after full refund)
```

**Business rules**:
- `total = subtotal - invoiceDiscount + tax` (enforced in application layer)
- `receiptNumber` is assigned atomically at the moment of `completed` transition
- Receipt number format: `{warehousePrefix}-{date}-{sequence}` e.g., `WH01-20260508-00042`
- A `completed` sale is immutable locally; only `remoteId` and `syncStatus` can change after completion
- `paidCash + paidCard` MUST equal `total` (enforced before completing)

---

## Entity: SaleItem

**Scope**: Local SQLite + Cloud PostgreSQL (embedded in sale sync payload)
**Sync direction**: Synced as part of the parent Sale

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `saleId` | UUID | NOT NULL, FK → Sale | |
| `productLocalId` | UUID | NOT NULL | Reference, not enforced FK (product may update) |
| `snapshot` | JSON | NOT NULL | Full product snapshot at time of add (see below) |
| `quantity` | Decimal | NOT NULL, > 0 | Supports fractional quantities (e.g., 1.5 kg) |
| `unitPrice` | Decimal | NOT NULL, ≥ 0 | From snapshot; not updated if product price changes |
| `discount` | Decimal | NOT NULL, DEFAULT 0 | Line-item discount amount |
| `tax` | Decimal | NOT NULL, DEFAULT 0 | `quantity × unitPrice × product.taxRate` |
| `lineTotal` | Decimal | NOT NULL | `(quantity × unitPrice) - discount + tax` |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | |

**Snapshot JSON structure**:
```json
{
  "barcode": "6281234567890",
  "sku": "PROD-001",
  "nameAr": "زيت دوار الشمس",
  "nameEn": "Sunflower Oil",
  "price": "12.500",
  "taxRate": "0.150",
  "unit": "bottle",
  "warehouseId": "uuid"
}
```

**Business rules**:
- `snapshot` is written once when the item is added to the cart and NEVER updated
- `lineTotal` is recalculated in the application layer on every quantity or discount change
- Fractional quantities only allowed for products with `unit` in the set: `kg`, `g`, `litre`, `ml`

---

## Entity: Payment

**Scope**: Local SQLite + Cloud PostgreSQL (embedded in sale sync payload)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `saleId` | UUID | NOT NULL, FK → Sale | |
| `method` | Enum | NOT NULL | `cash` \| `card` \| `split-cash` \| `split-card` |
| `amount` | Decimal | NOT NULL, > 0 | |
| `reference` | String? | Null for cash | Card terminal approval reference |
| `createdAt` | DateTime | NOT NULL | |

**Business rules**:
- For a split payment: two Payment records are created (one `split-cash`, one `split-card`)
- `sum(payment.amount for sale)` MUST equal `sale.total` for `completed` sales

---

## Entity: Refund

**Scope**: Local SQLite + Cloud PostgreSQL
**Sync direction**: Local creates → Cloud receives

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `originalSaleId` | UUID | NOT NULL, FK → Sale | |
| `cashierId` | UUID | NOT NULL | Initiating cashier |
| `supervisorId` | UUID | NOT NULL | Authorizing supervisor |
| `items` | JSON | NOT NULL | Array of refund items (see below) |
| `total` | Decimal | NOT NULL, > 0 | Sum of refunded amounts |
| `receiptNumber` | String | NOT NULL, UNIQUE | Format: `REF-{original}-{seq}` |
| `createdAt` | DateTime | NOT NULL | |
| `updatedAt` | DateTime | NOT NULL | |

**Refund items JSON structure**:
```json
[
  {
    "saleItemId": "uuid",
    "quantity": 1,
    "unitPrice": "12.500",
    "amount": "12.500",
    "reason": "customer_return"
  }
]
```

**Business rules**:
- Partial refund: only specified items and quantities are refunded
- Full refund: all items; triggers `sale.status = 'refunded'`
- Duplicate refund prevention: `sum(refunded quantities for saleItemId)` MUST NOT exceed
  the original `saleItem.quantity`
- Refund creation requires `supervisorId` to be set (verified via PIN flow)

---

## Entity: AuditLog

**Scope**: Local SQLite + Cloud PostgreSQL
**Sync direction**: Local creates → Cloud receives (append-only; never updated)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `userId` | UUID | NOT NULL | Actor performing the action |
| `action` | Enum | NOT NULL | See action enum below |
| `entityType` | String | NOT NULL | e.g., `sale`, `shift`, `refund` |
| `entityId` | UUID | NOT NULL | localId of the affected entity |
| `warehouseId` | UUID | NOT NULL | |
| `terminalId` | String | NOT NULL | |
| `beforeState` | JSON? | Nullable for create actions | Snapshot before change |
| `afterState` | JSON? | Nullable for delete-equivalent actions | Snapshot after change |
| `timestamp` | DateTime | NOT NULL, DEFAULT now() | |

**Action enum**:
```
sale_completed, sale_cancelled, sale_held, sale_resumed,
refund_issued, discount_applied_above_threshold,
shift_opened, shift_closed,
supervisor_pin_used, print_failed, print_reprinted,
catalog_synced
```

**Business rules**:
- `AuditLog` records are IMMUTABLE after insert; no UPDATE or DELETE permitted
- Written within the same SQLite transaction as the primary action
- `beforeState` and `afterState` are JSON snapshots of the entity (not references)

---

## Entity: SyncQueue

**Scope**: Local SQLite only (not synced to cloud — it IS the sync mechanism)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `entityType` | String | NOT NULL | `sale`, `shift`, `refund`, `audit_log` |
| `entityId` | String | NOT NULL | `localId` of the entity to sync |
| `operation` | String | NOT NULL | `create` \| `update` |
| `payload` | JSON | NOT NULL | Full entity payload to POST to API |
| `priority` | Int | NOT NULL, DEFAULT 5 | 1=highest (audit), 9=lowest |
| `status` | Enum | NOT NULL, DEFAULT `pending` | `pending` \| `syncing` \| `synced` \| `error` \| `dead` |
| `attempts` | Int | NOT NULL, DEFAULT 0 | |
| `nextRetryAt` | DateTime | NOT NULL, DEFAULT now() | |
| `lastError` | String? | | Last error message |
| `createdAt` | DateTime | NOT NULL | |
| `updatedAt` | DateTime | NOT NULL | |

**Indexes**: `(status, priority, next_retry_at)` composite index for efficient polling

---

## Entity: User (Local Cache)

**Scope**: Local SQLite (cache only; authoritative on cloud)
**Sync direction**: Cloud → Local (push on login and periodic refresh)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `localId` | UUID | PK | |
| `remoteId` | UUID | NOT NULL, UNIQUE | Cloud user ID |
| `username` | String | NOT NULL, UNIQUE | |
| `nameAr` | String | NOT NULL | Display name in Arabic |
| `nameEn` | String | NOT NULL | Display name in English |
| `pinHash` | String | NOT NULL | bcrypt hash of 4-digit PIN |
| `role` | Enum | NOT NULL | `cashier` \| `supervisor` \| `admin` |
| `warehouseId` | UUID | NOT NULL | |
| `isActive` | Boolean | NOT NULL, DEFAULT true | |
| `updatedAt` | DateTime | NOT NULL | |

**Business rules**:
- `pinHash` is a bcrypt hash (cost factor 10); raw PIN is never stored
- Local user cache is refreshed on each successful login and every 24 hours
- An inactive user (`isActive = false`) MUST NOT be allowed to log in

---

## Entity: PrintJob

**Scope**: Local SQLite only

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `saleId` | UUID | NOT NULL | |
| `type` | Enum | NOT NULL | `receipt` \| `refund_receipt` |
| `status` | Enum | NOT NULL | `pending` \| `printed` \| `failed` |
| `attempts` | Int | NOT NULL, DEFAULT 0 | |
| `lastAttemptAt` | DateTime? | | |
| `error` | String? | | Last error message |
| `createdAt` | DateTime | NOT NULL | |

---

## Entity Relationship Summary

```
Warehouse (cloud only, read by POS)
  └── has many → Product
  └── has many → Shift
  └── has many → Sale

User (cached locally)
  └── opens/closes → Shift
  └── creates → Sale
  └── authorizes → Refund (as supervisor)

Shift
  └── has many → Sale

Sale
  └── has many → SaleItem
  └── has many → Payment
  └── has many → Refund
  └── triggers → AuditLog entries
  └── triggers → SyncQueue events
  └── triggers → PrintJob

SaleItem
  └── embeds → Product snapshot (JSON, point-in-time)

Refund
  └── references → Sale
  └── triggers → AuditLog entries
  └── triggers → SyncQueue events
```

---

## Cloud-Only Entities (PostgreSQL, admin dashboard scope)

These entities exist only in the cloud PostgreSQL database and are NOT part of the
local POS schema. They are included here for reference as they are the sync targets.

**Warehouse**: `id`, `name`, `address`, `isActive`, timestamps
**Terminal**: `id`, `warehouseId`, `label`, `isActive`, timestamps
**ProductCategory**: `id`, `nameAr`, `nameEn`, `parentId?`, timestamps
**InventoryLevel**: `productId`, `warehouseId`, `quantity`, `updatedAt`
(inventory levels are tracked server-side from sale sync events)