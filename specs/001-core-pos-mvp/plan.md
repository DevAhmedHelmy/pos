# Implementation Plan: Core POS MVP

**Branch**: `001-core-pos-mvp` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-core-pos-mvp/spec.md`

---

## Summary

The Core POS MVP delivers a fully offline-capable cashier terminal application built as a Tauri desktop app, backed by a local SQLite store as the operational source of truth.

All cashier actions — scan, cart, discount, payment, receipt, refund, and shift management — are committed locally first and synced to a cloud PostgreSQL database when connectivity is available.

The NestJS API serves catalog synchronization, authentication, cloud reconciliation, reporting ingestion, and management operations. It is never in the critical path for POS cashier operations.

The POS must remain fast, stable, Arabic-first, keyboard-first, and usable for an entire working day even without internet access.

---

## Technical Context

**Language/Version**: TypeScript 5.x strict mode across all frontend, backend, and shared packages  
**Desktop App**: Tauri 2.x  
**Frontend**: React 18 + TypeScript  
**Admin Dashboard**: Next.js App Router  
**POS State Management**: Zustand  
**Local Database**: SQLite 3  
**Local ORM / Query Layer**: Drizzle ORM  
**Cloud Database**: PostgreSQL 16  
**Cloud ORM**: Prisma 5  
**Backend API**: NestJS 10  
**Queue / Jobs**: Redis 7 + BullMQ 5  
**Testing**: Vitest, Jest + Supertest, Playwright  
**Target Platform**: Windows 10/11 desktop first; macOS optional later  
**Project Type**: Offline-first desktop POS + REST API + web admin dashboard in a monorepo  
**Performance Goals**: scan-to-cart under 200ms, payment finalization under 500ms, product search under 300ms  
**Constraints**: 100% offline operation for cashier flows, 12+ hour stable operation, 50,000+ local products without performance degradation  
**Scale/Scope**: Single terminal per store for MVP, with architecture prepared for multi-branch SaaS growth

---

## Constitution Check

*GATE: Must pass before design and implementation. Re-check after major plan changes.*

| Principle | Gate | Status |
|---|---|---|
| I. Code Quality | TypeScript strict, no unjustified `any`, linting and formatting required | ✅ Required in all packages |
| II. Architecture | Turborepo monorepo, modular monolith, one-way dependency direction | ✅ Structure defined below |
| III. Offline-First | All cashier operations work offline; local SQLite is operational source of truth | ✅ Core design constraint |
| IV. Sync Engine | Idempotent sync, retry, backoff, dead-letter handling | ✅ Sync engine designed below |
| V. Database Design | UUIDs, soft deletes, warehouse-aware inventory, decimal financial values | ✅ Schema designed below |
| VI. API Design | Versioned API, consistent responses, validation, auth, RBAC | ✅ Contracts planned below |
| VII. UI/UX | Arabic RTL primary, keyboard-first cashier flow, visible sync state | ✅ UI architecture designed below |
| VIII. Security | Secrets in env, server-side RBAC, local permission enforcement, audit logs | ✅ Security designed below |
| IX. Performance | Fast barcode, fast payment, indexed SQLite, optimized rendering | ✅ Performance strategy below |
| X. Testing | Critical business logic, integration tests, E2E cashier flows | ✅ Testing strategy below |
| XI. Error Handling | Typed errors, actionable UI messages, no network errors blocking cashiers | ✅ Error handling below |
| XII. Logging & Audit | Immutable financial audit trail, structured logs | ✅ Audit log design below |
| XIII. i18n | Arabic and English strings, RTL correctness | ✅ i18n design below |
| XIV. Deployment | Docker for cloud apps, signed Tauri installers, safe migrations | ✅ Deployment plan below |
| XV. Git Workflow | Feature branches, Conventional Commits, protected main | ✅ Enforced through repository rules |
| XVI. Spec-Driven | spec.md = WHAT/WHY, plan.md = HOW, tasks.md = actionable implementation | ✅ This document is HOW |

**Constitution Check Result**: ✅ All gates pass.

---

## Project Structure

### Documentation Structure

```text
specs/001-core-pos-mvp/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-auth.md
│   ├── api-sync.md
│   └── api-products.md
└── tasks.md
```

### Source Code Structure

```text
apps/
├── pos/                          # Tauri desktop POS application
│   ├── src-tauri/                # Rust Tauri backend
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── commands/         # Tauri IPC command handlers
│   │   │   │   ├── auth.rs
│   │   │   │   ├── cart.rs
│   │   │   │   ├── payment.rs
│   │   │   │   ├── print.rs
│   │   │   │   ├── refund.rs
│   │   │   │   ├── shift.rs
│   │   │   │   └── hardware.rs
│   │   │   ├── hardware/         # Hardware adapters
│   │   │   │   ├── printer.rs
│   │   │   │   ├── cash_drawer.rs
│   │   │   │   ├── barcode.rs
│   │   │   │   └── card_terminal.rs
│   │   │   └── os/               # OS integrations
│   │   └── tauri.conf.json
│   │
│   ├── src/                      # React frontend
│   │   ├── components/
│   │   │   ├── cart/
│   │   │   ├── payment/
│   │   │   ├── shift/
│   │   │   ├── refund/
│   │   │   └── shared/
│   │   ├── screens/
│   │   │   ├── PosScreen.tsx
│   │   │   ├── ShiftScreen.tsx
│   │   │   ├── RefundScreen.tsx
│   │   │   └── HeldSalesScreen.tsx
│   │   ├── stores/
│   │   │   ├── cartStore.ts
│   │   │   ├── shiftStore.ts
│   │   │   ├── heldSalesStore.ts
│   │   │   └── syncStore.ts
│   │   ├── services/
│   │   │   ├── CartService.ts
│   │   │   ├── PaymentService.ts
│   │   │   ├── ReceiptService.ts
│   │   │   ├── RefundService.ts
│   │   │   ├── ShiftService.ts
│   │   │   └── ipc.ts
│   │   ├── hooks/
│   │   ├── i18n/
│   │   └── main.tsx
│   └── tests/
│       └── e2e/
│
├── admin/                        # Next.js admin dashboard
│   └── ...
│
└── api/                          # NestJS backend API
    ├── src/
    │   ├── auth/
    │   ├── products/
    │   ├── sync/
    │   ├── shifts/
    │   ├── sales/
    │   ├── refunds/
    │   └── shared/
    └── test/
        ├── integration/
        └── unit/

packages/
├── shared/                       # Shared TypeScript types, constants, errors, utilities
│   ├── src/
│   │   ├── types/
│   │   ├── constants/
│   │   ├── errors/
│   │   └── utils/
│   └── package.json
│
├── db-cloud/                     # Prisma schema and client for PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
├── db-local/                     # Drizzle schema and migrations for SQLite
│   ├── src/
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   ├── client.ts
│   │   └── queries/
│   ├── drizzle.config.ts
│   └── package.json
│
└── sync/                         # Sync engine shared contracts and helpers
    ├── src/
    │   ├── queue.ts
    │   ├── worker.ts
    │   ├── conflicts.ts
    │   ├── idempotency.ts
    │   └── retry.ts
    └── package.json
```

**Structure Decision**: Use a Turborepo modular monolith with separate packages for shared types, local database, cloud database, and sync. The local POS uses Drizzle ORM for lightweight embedded SQLite performance. The cloud API uses Prisma for PostgreSQL migrations and server-side data modeling.

---

## Architecture

### Modular Monolith Approach

The system follows a modular monolith architecture for v1.

Microservices are explicitly out of scope for the MVP because they would introduce unnecessary complexity around distributed transactions, service discovery, inter-service authentication, observability, deployment, and debugging.

Modules are separated by package boundaries and application folders, not by independently deployed services.

### Monorepo Package Boundaries

Dependency direction is strictly enforced:

```text
apps/pos       → packages/shared, packages/db-local
apps/admin     → packages/shared
apps/api       → packages/shared, packages/db-cloud, packages/sync
packages/sync  → packages/shared, packages/db-cloud
packages/db-local → packages/shared
packages/db-cloud → packages/shared
packages/shared → no internal dependencies
```

Rules:

- Apps may import from packages.
- Packages must never import from apps.
- `packages/shared` must remain dependency-light.
- Circular dependencies are forbidden.
- Business logic must not live inside UI components.

### POS App Architecture

The POS app uses Tauri with two layers:

1. **React TypeScript Layer**
   - Owns UI, state, cashier workflows, cart calculations, validation, and user interactions.
   - Uses Zustand for state.
   - Talks to local services through typed IPC wrappers.

2. **Tauri Rust Layer**
   - Owns OS-level capabilities only.
   - Handles printing, cash drawer, device integrations, secure storage, file system access, and process-level events.
   - Must not contain cashier business logic.

### Business Logic Placement

Business logic lives in TypeScript services:

- `CartService`
- `PaymentService`
- `ReceiptService`
- `RefundService`
- `ShiftService`
- `SupervisorAuthService`

Rust must remain an integration boundary, not a domain layer.

This keeps the logic easier to test and easier to understand while still allowing Tauri to handle native capabilities.

### API Role

The NestJS API handles:

- Authentication
- Product catalog sync
- Transaction ingestion
- Shift ingestion
- Refund ingestion
- Audit log ingestion
- Admin dashboard reads/writes
- Reporting data preparation

The API is never required for active cashier operations.

---

## Hardware Abstraction Layer

All hardware integrations must go through dedicated adapters.

Supported hardware categories:

- Barcode scanners
- Thermal receipt printers
- Barcode label printers
- Cash drawers
- Card terminals

Rules:

- The POS UI must never communicate directly with hardware APIs.
- All hardware communication must occur through Tauri IPC services.
- Each hardware type must have a clear interface and replaceable adapter.
- Hardware failures must not corrupt sales data.
- Receipt printing and cash drawer opening are post-sale effects, not conditions for sale completion.

Adapter examples:

```text
PrinterAdapter
├── EscPosUsbPrinterAdapter
├── WindowsSpoolerPrinterAdapter
└── NetworkPrinterAdapter

CashDrawerAdapter
├── EscPosCashDrawerAdapter
└── NoopCashDrawerAdapter

CardTerminalAdapter
├── LocalTerminalAdapter
├── CloudProviderAdapter
└── ManualApprovalAdapter
```

This abstraction prevents the POS from becoming locked to one printer, scanner, or payment provider.

---

## Offline Strategy

### SQLite-First Write Flow

Every cashier write operation follows this sequence:

```text
Cashier action
→ Validate in TypeScript service layer
→ Persist to local SQLite using Drizzle
→ Update Zustand state
→ Insert sync event into local sync_queue
→ Return success to cashier UI
→ Background sync uploads event when possible
```

The UI must not wait for cloud sync before showing success.

### Local Source of Truth

For the POS app:

- Local SQLite is the operational source of truth.
- Product catalog reads happen locally.
- Cart state is recovered from local persistence.
- Shift state is recovered from local persistence.
- Completed sales are finalized locally first.
- Receipts are printed from local sale snapshots.

### Background Synchronization

The sync cycle runs in the background.

Flow:

```text
Connectivity detected
→ read pending sync_queue events
→ upload to API in priority order
→ mark as synced on success
→ retry with backoff on failure
→ move to dead-letter state after maximum retries
```

Sync must be invisible to the cashier during normal work.

### Sync Pause During Payment

Background sync must pause briefly during payment finalization.

Reason:

- Payment finalization is the most latency-sensitive operation.
- SQLite write contention must be avoided.
- The cashier must not experience UI lag during checkout.

### Sync Queue Lifecycle

```text
pending
→ syncing
→ synced
→ failed_retryable
→ pending after nextRetryAt
→ dead_letter after max attempts
```

### Conflict Handling Strategy

Default entity conflict strategy:

- Last-write-wins using `updatedAt`.
- Sales are immutable after completion.
- Completed sale financial data must never be overwritten by remote changes.

### Inventory Conflict Rule

Inventory-affecting entities must use append-only stock movement records instead of mutable quantity overwrites.

This prevents stock corruption during offline sync conflicts.

Instead of syncing only “new quantity”, the system syncs movements like:

```text
SALE_DEDUCT
REFUND_RESTOCK
PURCHASE_RECEIVE
TRANSFER_OUT
TRANSFER_IN
MANUAL_ADJUSTMENT
```

The final stock quantity is derived from movements.

### Recovery After Crash

On POS startup:

1. Restore open shift if one exists.
2. Restore active draft cart if one exists.
3. Restore held sales.
4. Resume pending sync queue.
5. Detect failed print jobs.
6. Show printer/sync warnings without blocking cashier login.

---

## Local Backup Strategy

The POS application should generate automatic encrypted local backups of the SQLite database at configurable intervals.

Recommended default:

- Backup every 6 hours while the app is running.
- Backup on successful shift close.
- Keep the latest 14 local backups.
- Store backups outside the active database folder.

Backup requirements:

- Backups must be encrypted.
- Backups must include local sales, shifts, refunds, audit logs, sync queue, and settings.
- Backup restoration must be supported from an admin-only settings screen.
- Backup restore must require supervisor/admin authorization.
- Backup restore must create a backup of the current database before replacing it.

This is important because an offline-first POS may hold unsynced financial data for hours or days.

---

## State Management

### Zustand Store Strategy

Zustand is used because it is simple, fast, and easier to learn than Redux for this project.

Stores:

- `cartStore`
- `shiftStore`
- `heldSalesStore`
- `syncStore`
- `authStore`
- `settingsStore`
- `printerStore`

### Cart Store

Responsibilities:

- Current cart items
- Quantity changes
- Discounts
- Subtotal
- Tax
- Total
- Active draft sale ID
- Selected cart item

Financial calculations use decimal arithmetic only.

### Shift Store

Responsibilities:

- Current shift
- Opening cash
- Shift status
- Shift close summary
- Shift reconciliation state

### Held Sales Store

Responsibilities:

- Held carts
- Hold reference numbers
- Resume sale
- Remove held sale after completion

### Sync Store

Responsibilities:

- Online/offline status
- Syncing state
- Pending count
- Last sync time
- Sync error state

Tauri emits sync status events to the React app.

---

## Database Design

## Local SQLite Database Using Drizzle

Local database is optimized for:

- Fast barcode lookup
- Fast product search
- Fast cart persistence
- Offline sales
- Local shift recovery
- Sync queue durability

Local tables:

- `products`
- `shifts`
- `sales`
- `sale_items`
- `payments`
- `refunds`
- `audit_logs`
- `sync_queue`
- `print_jobs`
- `stock_movements`
- `settings`
- `local_users`

All synced entities include:

- `localId`
- `remoteId`
- `syncStatus`
- `syncedAt`
- `version`
- `createdAt`
- `updatedAt`
- `deletedAt`

### Cloud PostgreSQL Database Using Prisma

Cloud database is the authoritative store for:

- Products
- Users
- Roles
- Warehouses
- Branches
- Sales
- Refunds
- Shifts
- Audit logs
- Stock movements
- Reports

Prisma is used for:

- PostgreSQL schema
- Cloud migrations
- API data access
- Relations
- Admin dashboard queries

### Price Snapshot Strategy

Every sale item must store a snapshot of the product at the moment of sale.

Snapshot includes:

- Product name Arabic
- Product name English
- SKU
- Barcode
- Unit price
- Tax rate
- Unit
- Discount

This guarantees that receipts, refunds, and audit logs remain correct after product price changes.

### Audit Log Strategy

Sensitive actions write audit logs in the same local transaction as the main operation.

Audited actions:

- Sale completed
- Sale cancelled
- Refund issued
- Shift opened
- Shift closed
- Above-threshold discount approved
- Supervisor PIN used
- Receipt reprinted
- Backup restored

Audit logs are append-only and must not be edited or deleted.

---

## POS Workflow Architecture

### Barcode Scanning Flow

```text
Scanner emits keystrokes
→ Barcode buffer captures input
→ Enter or idle timeout finalizes barcode
→ CartService.addByBarcode(barcode)
→ Local SQLite lookup by indexed barcode
→ Product found?
   → Add to cart or increment quantity
   → Recalculate totals
   → Persist draft sale locally
   → Update UI
→ Product not found?
   → Show localized product not found message
```

Consecutive scans of the same barcode should increase item quantity instead of creating duplicate cart rows when product merging is enabled.

### Cart Lifecycle

```text
idle
→ draft cart
→ item changes
→ optional discount
→ hold OR cancel OR payment
→ completed sale
→ receipt print
→ sync queued
→ idle
```

Draft carts are persisted locally so they can recover after crashes.

### Payment Lifecycle

Cash payment:

```text
Enter tendered amount
→ validate amount >= total
→ calculate change
→ confirm payment
→ local transaction writes sale + payment + audit + sync queue
→ trigger receipt print
→ trigger cash drawer if available
→ clear cart
```

Card payment:

```text
Select card payment
→ call CardTerminalAdapter
→ approved?
   → finalize sale locally
   → print receipt
→ declined/timeout?
   → keep cart active
   → allow retry or payment method change
```

Split payment:

```text
Enter cash amount
→ calculate remaining card amount
→ process card amount
→ finalize both payment legs locally
→ print receipt
```

### Refund Lifecycle

```text
Open refund flow
→ enter receipt number
→ find sale locally
→ select refundable items
→ require supervisor authorization
→ create refund locally
→ audit refund
→ queue sync
→ print refund receipt
```

### Receipt Reprint Lifecycle

```text
Request reprint
→ check authorization/time window
→ fetch sale snapshot locally
→ render receipt
→ print
→ audit reprint action
```

---

## UI Architecture

### Main POS Layout

The main POS screen is a fixed cashier workspace.

It contains:

- Header with sync status, cashier name, shift info, and clock
- Cart panel
- Product search / barcode input
- Summary panel
- Payment buttons
- Hold/resume/cancel actions
- Keyboard shortcut footer

During Arabic mode, the screen is RTL-first.

### Keyboard Shortcuts

Recommended defaults:

| Key | Action |
|---|---|
| F1 | Focus search/barcode input |
| F2 | Cash payment |
| F3 | Card payment |
| F4 | Split payment |
| F5 | Hold current sale |
| F6 | Resume held sale |
| F7 | Cancel current sale |
| F8 | Refund |
| F9 | Reprint last receipt |
| F10 | Close shift |
| Enter | Confirm current action |
| Escape | Close modal/cancel current overlay |
| Delete | Remove selected cart item |
| + | Increase quantity |
| - | Decrease quantity |

### RTL Handling

Rules:

- Arabic is the default locale.
- Root direction uses `dir="rtl"` for Arabic.
- CSS logical properties must be preferred over left/right.
- Directional icons must mirror in RTL.
- English mode must switch to LTR cleanly.

### Error State Handling

Error display levels:

1. Toast: product not found, reprint success.
2. Inline: invalid quantity, insufficient payment.
3. Modal: payment terminal failure, supervisor approval, shift already open.

All errors must be localized and actionable.

### Loading State Handling

Loading states are only used for unpredictable operations:

- Card terminal waiting
- Refund lookup
- Shift summary generation
- Backup restore

Fast local operations should not show loading spinners.

### Large Cart Rendering

Large cart rendering must use virtualization to prevent UI lag during bulk-item transactions.

If the cart exceeds 50 items, the cart list should render using a virtualized list to avoid unnecessary DOM rendering.

---

## Printing Strategy

### Receipt Printing

Receipt printing runs through Tauri hardware adapters.

Flow:

```text
Sale completed locally
→ ReceiptService creates receipt document from sale snapshot
→ Tauri IPC print command
→ PrinterAdapter sends ESC/POS or OS print job
→ success or failure returned
```

Receipt content must come from stored sale snapshots, not live product data.

### Printer Failure Handling

Printer failure must not cancel a completed sale.

If printing fails:

- Sale remains completed.
- Failed print job is saved locally.
- Cashier sees a clear reprint prompt.
- Reprint is available after printer issue is resolved.

### Deferred Reprint

Failed print jobs are stored in `print_jobs`.

Reprint flow:

```text
Open failed print prompt
→ fetch sale snapshot
→ print again
→ mark print job resolved on success
→ keep unresolved on failure
```

### Cash Drawer Trigger

Cash drawer opening is best effort.

Flow:

```text
Cash sale completed
→ send cash drawer command via printer adapter
→ do not block UI
→ log failure if drawer does not open
```

Cash drawer failure does not affect the sale.

---

## Sync Engine

### Local Sync Queue

POS writes every syncable event to local `sync_queue`.

Sync event fields:

- `id`
- `entityType`
- `entityId`
- `operation`
- `payload`
- `priority`
- `status`
- `attempts`
- `nextRetryAt`
- `lastError`
- `createdAt`

### Sync Priorities

| Event Type | Priority |
|---|---:|
| Audit log | 1 |
| Sale | 2 |
| Refund | 2 |
| Shift | 3 |
| Stock movement | 4 |
| Product catalog pull | 9 |

### Retry Mechanism

Retry uses exponential backoff:

```text
5s → 10s → 20s → 40s → 80s → 160s → 300s → 300s → 300s → 300s
```

After maximum retries, the event becomes dead-letter and requires admin resolution.

### Idempotency Strategy

Every sync event includes an idempotency key:

```text
entityType:localId:version
```

The API must reject duplicate processing while still returning success for already processed events.

### Sync Prioritization

Financial and audit events sync before catalog updates.

Catalog updates must not interrupt sales or payment flows.

### Offline Recovery

When internet returns:

```text
Detect online
→ sync status becomes Syncing
→ process pending events in priority order
→ update local sync statuses
→ sync status becomes Online
```

If sync fails, cashier continues working and manager is notified.

---

## API Architecture

### API Responsibilities

NestJS API provides:

- `/api/v1/auth`
- `/api/v1/products`
- `/api/v1/sync`
- `/api/v1/shifts`
- `/api/v1/sales`
- `/api/v1/refunds`
- `/api/v1/audit-logs`

All endpoints use:

- JWT authentication
- DTO validation
- Consistent response envelope
- RBAC guards
- OpenAPI documentation

### Response Envelope

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Error response:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

## Security

### Authentication

POS login flow:

```text
Cashier enters username/PIN
→ API validates online if available
→ tokens returned
→ local session cached securely
→ offline login allowed within configured offline window
```

Offline login uses the last valid local auth cache.

### Supervisor PIN Flow

Sensitive actions trigger supervisor approval:

- Above-threshold discounts
- Refunds
- Closing another cashier shift
- Restricted receipt reprints
- Backup restore

Flow:

```text
Sensitive action requested
→ supervisor overlay appears
→ supervisor PIN entered
→ local permission cache validates
→ action continues
→ audit log records supervisorId
```

### Role Enforcement

RBAC is enforced at:

1. UI layer for visibility.
2. Service layer for business rules.
3. Tauri IPC layer for local enforcement.
4. NestJS API layer for cloud enforcement.

UI-only authorization is not trusted.

---

## Performance Strategy

### Barcode Lookup

Barcode lookup uses a unique indexed column.

Target:

- SQLite lookup under 5ms.
- Full scan-to-cart under 200ms.

### Product Search

Product search uses SQLite FTS5 for Arabic and English names.

Target:

- Search results under 300ms.
- Support 50,000+ products.

### SQLite Optimization

Required SQLite settings:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
```

Required indexes:

- `products.barcode`
- `products.sku`
- `products.nameAr` search index
- `products.nameEn` search index
- `sales.receiptNumber`
- `sales.status`
- `sales.shiftId`
- `sync_queue.status + priority + nextRetryAt`
- `audit_logs.entityType + entityId`

### UI Optimization

- Use memoized selectors.
- Avoid unnecessary global re-renders.
- Use virtualized cart list for large carts.
- Keep receipt rendering pure and non-React.
- Avoid blocking sync during payment finalization.

---

## Error Handling Architecture

### Error Types

Shared error hierarchy:

```text
AppError
├── ValidationError
├── AuthError
├── PermissionError
├── NotFoundError
├── ConflictError
├── SyncError
├── PrintError
└── CriticalError
```

### Network Error Containment

Network errors are contained inside the sync engine.

Cashier-facing UI must not show technical network failures during normal operations.

### Printer Errors

Printer errors are actionable:

- Printer offline
- Out of paper
- Port unavailable
- Unknown printer error

Sale completion remains valid regardless of printing result.

---

## Internationalization Architecture

### Locale Strategy

Supported locales for MVP:

- Arabic: `ar`
- English: `en`

Arabic is default.

### i18n Rules

- No hardcoded user-facing strings.
- Translation keys use namespaces.
- Receipts must support Arabic and English text.
- Currency, dates, and numbers use locale-aware formatting.

### Key Naming Convention

```text
screen.component.key
```

Examples:

```text
pos.cart.itemAdded
pos.payment.insufficientAmount
shift.close.expectedCash
refund.lookup.notFound
```

---

## Testing Strategy

### Unit Tests

Unit tests cover:

- Cart calculations
- Discount calculations
- Tax calculations
- Change calculation
- Refund calculations
- Sync retry logic
- Idempotency key generation
- Conflict resolution
- Currency utilities

### Integration Tests

Integration tests cover:

- Auth endpoints
- Product sync endpoints
- Sale ingestion endpoints
- Refund ingestion endpoints
- Shift ingestion endpoints
- Sync idempotency
- RBAC enforcement

Integration tests use real PostgreSQL for API tests.

### E2E Tests

Mandatory cashier flows:

1. Standard cash sale.
2. Standard card sale.
3. Split payment sale.
4. Hold and resume sale.
5. Refund flow.
6. Shift open and close.
7. Printer failure and reprint.
8. Offline sale and later sync.

---

## Deployment Considerations

### Desktop Packaging

Tauri builds:

- Windows `.exe` installer for MVP.
- Signed installer required for production.
- Auto-update support recommended.

### Local Database Migrations

Drizzle migrations run on POS app startup.

Flow:

```text
App starts
→ check local DB version
→ backup current DB
→ run pending migrations
→ start POS
```

If migration fails, app must stop safely and show an admin-facing error.

### Cloud Deployment

API and admin dashboard run in Docker.

Cloud services:

- NestJS API
- PostgreSQL
- Redis
- BullMQ worker
- Next.js admin dashboard

### Environment Management

Environments:

- Development
- Staging
- Production

Secrets are never committed.

---

## Development Workflow

Implementation order:

1. Monorepo setup.
2. Shared package setup.
3. Local SQLite + Drizzle setup.
4. Cloud Prisma + NestJS setup.
5. POS shell setup.
6. Auth and shift foundation.
7. Product catalog local read model.
8. Barcode scanning and cart.
9. Payments.
10. Receipt printing.
11. Hold/resume.
12. Refunds.
13. Sync queue.
14. API sync ingestion.
15. i18n and RTL polish.
16. Tests.
17. Packaging.

---

## Open Technical Decisions

These should be resolved before implementation tasks begin:

1. Exact printer adapter priority: Windows Spooler first or ESC/POS direct first.
2. Card terminal integration provider for MVP.
3. Offline login maximum allowed duration.
4. Backup encryption method.
5. Whether product catalog sync is polling-based or push-based for MVP.

Recommended MVP decisions:

- Start with ESC/POS thermal printer support.
- Use manual card approval simulation first, then provider adapter later.
- Allow offline login for 24 hours after last successful online login.
- Use encrypted local backup with app-managed key stored in OS secure storage.
- Use polling-based catalog sync for MVP.

---

## Phase 0 Research Output

Create `research.md` to document final technical choices and tradeoffs.

Required topics:

- Drizzle vs Prisma for local SQLite.
- ESC/POS vs OS printer spooler.
- Zustand state design.
- Tauri hardware adapters.
- SQLite FTS5 for product search.
- Sync retry and idempotency.

---

## Phase 1 Design Output

Create:

- `data-model.md`
- `contracts/api-auth.md`
- `contracts/api-sync.md`
- `contracts/api-products.md`
- `quickstart.md`

These files must align with this plan before `/speckit-tasks` is generated.
