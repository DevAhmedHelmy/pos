# Implementation Plan: Core POS MVP

**Branch**: `001-core-pos-mvp` | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-pos-mvp/spec.md`

---

## Summary

The Core POS MVP delivers a fully offline-capable cashier terminal application built as a
Tauri desktop app, backed by a local SQLite store as the operational source of truth. All
cashier actions (scan, cart, discount, payment, receipt, refund, shift) are committed locally
first and synced to a cloud PostgreSQL database via a BullMQ-backed sync engine when
connectivity is available. The NestJS API serves catalog sync and cloud reconciliation; it is
never in the critical path for POS operations.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict) — all packages and apps
**Primary Dependencies**: Tauri 2.x, React 18, Zustand 4, Prisma 5, NestJS 10, BullMQ 5,
Redis 7, SQLite 3 (via better-sqlite3 in Tauri sidecar)
**Storage**: SQLite (local POS), PostgreSQL 16 (cloud API)
**Testing**: Vitest (unit), Jest + Supertest (API integration), Playwright (E2E)
**Target Platform**: Windows 10/11 desktop (primary); macOS optional
**Project Type**: Offline-first desktop POS + REST API + web admin dashboard (monorepo)
**Performance Goals**: scan-to-cart < 200 ms; payment finalization < 500 ms; search < 300 ms
**Constraints**: 100% offline operation for all cashier flows; 12+ hour stable operation;
50,000+ products in local catalog without performance degradation
**Scale/Scope**: Single terminal per installation for MVP; multi-branch SaaS architecture
from day one to avoid future migration pain

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Code Quality | TypeScript strict, no `any`, ESLint/Prettier in CI | ✅ Required in all packages |
| II. Architecture | Turborepo monorepo, one-way dependency direction, no circular deps | ✅ Structure defined below |
| III. Offline-First | ALL cashier ops work offline; SQLite is source of truth; UI never blocks on network | ✅ Core design constraint |
| IV. Sync Engine | BullMQ+Redis, idempotent, exponential backoff, dead-letter queue | ✅ Sync engine designed below |
| V. Database Design | UUID PKs, soft deletes, warehouse_id on inventory, backwards-compatible migrations | ✅ Schema designed below |
| VI. API Design | `/api/v1/`, consistent envelope, cursor pagination, JWT auth, class-validator | ✅ Contracts defined in contracts/ |
| VII. UI/UX | Arabic RTL primary, keyboard-only cashier flow, 44px targets, all three states | ✅ UI architecture designed below |
| VIII. Security | Secrets in env vars, Prisma-only (no raw SQL), RBAC at Guard level, audit trail | ✅ Security architecture designed below |
| IX. Performance | Scan < 200ms, finalization < 500ms, admin load < 2s, indexed SQLite, bundles < 500KB | ✅ Performance strategy designed below |
| X. Testing | Unit (services), integration (real DB), E2E (5 critical flows), ≥ 70% coverage | ✅ Testing strategy defined below |
| XI. Error Handling | Typed AppError hierarchy, no network errors to cashier UI, CRITICAL alerts | ✅ Error handling designed below |
| XII. Logging | Immutable audit log, structured JSON, append-only, centralized in production | ✅ Audit log design below |
| XIII. i18n | i18n keys everywhere, ar + en complete, RTL tested per component | ✅ i18n architecture below |
| XIV. Deployment | Docker API/admin, signed Tauri .exe, zero-downtime API, auto migrations | ✅ Deployment plan below |
| XV. Git Workflow | feature/###-*, Conventional Commits, protected main, rebase merge | ✅ Enforced via branch naming |
| XVI. Spec-Driven | spec.md = WHAT/WHY; plan.md = HOW; tasks.md = actionable tasks | ✅ This document is HOW |

**Constitution Check Result**: ✅ All gates pass. No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-core-pos-mvp/
├── plan.md              # This file
├── research.md          # Technology decisions and rationale
├── data-model.md        # Entity definitions, fields, relationships
├── quickstart.md        # Developer setup guide
├── contracts/
│   ├── api-auth.md      # Authentication endpoints
│   ├── api-sync.md      # Sync API endpoints
│   └── api-products.md  # Product catalog endpoints
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

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
│   │   │   │   └── shift.rs
│   │   │   └── db/               # SQLite access via rusqlite or sqlx
│   │   └── tauri.conf.json
│   ├── src/                      # React frontend (TypeScript)
│   │   ├── components/
│   │   │   ├── cart/
│   │   │   ├── payment/
│   │   │   ├── shift/
│   │   │   ├── refund/
│   │   │   └── shared/
│   │   ├── screens/
│   │   │   ├── PosScreen.tsx     # Main cashier screen
│   │   │   ├── ShiftScreen.tsx
│   │   │   ├── RefundScreen.tsx
│   │   │   └── HeldSalesScreen.tsx
│   │   ├── stores/               # Zustand stores
│   │   │   ├── cartStore.ts
│   │   │   ├── shiftStore.ts
│   │   │   └── syncStore.ts
│   │   ├── services/             # IPC wrappers
│   │   ├── hooks/
│   │   ├── i18n/
│   │   └── main.tsx
│   └── tests/
│       └── e2e/                  # Playwright E2E tests
│
├── admin/                        # Next.js admin dashboard
│   └── ...
│
└── api/                          # NestJS backend
    ├── src/
    │   ├── auth/
    │   ├── products/
    │   ├── sync/
    │   ├── shifts/
    │   ├── sales/
    │   └── shared/
    └── test/
        ├── integration/
        └── unit/

packages/
├── shared/                       # Shared TypeScript types and utilities
│   ├── src/
│   │   ├── types/
│   │   │   ├── cart.ts
│   │   │   ├── product.ts
│   │   │   ├── sale.ts
│   │   │   ├── shift.ts
│   │   │   ├── sync.ts
│   │   │   └── roles.ts
│   │   ├── constants/
│   │   │   ├── roles.ts
│   │   │   ├── sync-status.ts
│   │   │   └── payment-methods.ts
│   │   ├── errors/
│   │   │   └── AppError.ts
│   │   └── utils/
│   │       ├── currency.ts       # Decimal-precise arithmetic
│   │       └── dates.ts
│   └── package.json
│
├── db/                           # Prisma schema + generated clients
│   ├── prisma/
│   │   ├── schema.prisma         # Cloud PostgreSQL schema
│   │   ├── schema-local.prisma   # Local SQLite schema
│   │   └── migrations/
│   └── package.json
│
└── sync/                         # Sync engine
    ├── src/
    │   ├── queue.ts              # BullMQ queue definitions
    │   ├── worker.ts             # BullMQ worker
    │   ├── conflicts.ts          # Conflict resolution logic
    │   ├── idempotency.ts
    │   └── retry.ts
    └── package.json
```

**Structure Decision**: Turborepo monorepo with 3 apps and 3 packages. This is justified
by the 3 distinct deployment targets (Tauri desktop, Next.js web, NestJS server) sharing
types, database schema, and sync logic. The package count (3) is minimal and each package
has a clear, non-overlapping responsibility.

---

## Architecture

### Monorepo Package Boundaries

Dependency direction is strictly enforced:

```
apps/pos      → packages/shared, packages/db (local schema only)
apps/admin    → packages/shared, packages/db (cloud schema)
apps/api      → packages/shared, packages/db (cloud schema), packages/sync
packages/sync → packages/shared, packages/db
packages/db   → (no internal deps)
packages/shared → (no internal deps)
```

`packages/sync` is only imported by `apps/api` on the server side. The Tauri POS app
does NOT import the BullMQ sync package; instead, it writes to a local sync queue table
in SQLite, and the API-side worker polls or receives webhooks to process it.

### POS App Architecture (Tauri)

The POS app uses a two-process model:
- **Rust backend process**: Owns all SQLite access, file I/O, printer communication,
  and Tauri IPC command handlers. No business logic is in the Rust layer beyond
  dispatching to SQLite and returning results.
- **React frontend process** (WebView): Owns all UI state, user interaction, and
  business logic (cart calculation, validation). Communicates with Rust via typed
  Tauri IPC commands.

Business logic lives in the React process in TypeScript service classes
(e.g., `CartService`, `PaymentService`). This keeps logic testable without Rust.

SQLite access uses Prisma with `better-sqlite3` driver via a Tauri sidecar process, or
alternatively directly via `rusqlite` in Rust for performance-critical lookups.
Decision: use **Tauri sidecar with better-sqlite3** for the MVP to share Prisma schema
with the cloud; migrate to native Rust SQLite if performance benchmarks demand it.

### API Boundaries

The NestJS API serves two purposes in this system:
1. **Catalog push**: delivers product catalog updates to POS terminals on demand or via
   background polling.
2. **Transaction ingestion**: receives completed sales, shifts, refunds from the sync
   engine and persists them to PostgreSQL.

The API is **never in the critical path** for any cashier action. A POS terminal that
cannot reach the API continues operating indefinitely.

---

## Offline Strategy

### SQLite-First Write Flow

Every write operation in the POS follows this sequence:

```
Cashier action
  → Validate in React service layer (synchronous, in-memory)
  → Write to SQLite via Tauri IPC (synchronous, sub-5ms)
  → Update Zustand store (triggers React re-render)
  → Enqueue sync event in SQLite sync_queue table
  → Return success to UI
  → [background] Sync worker reads sync_queue and uploads to API
```

The UI never waits for the sync step. The cashier sees the result of their action
before sync has been attempted.

### Background Synchronization

The sync cycle runs as a Tauri background task (Rust async):
1. On connectivity detected: start sync cycle
2. Poll `sync_queue` where `status = 'pending'` ordered by priority (audit > sale > shift)
3. For each event: POST to NestJS API
4. On success: mark `status = 'synced'`, set `synced_at`
5. On failure: increment `attempts`, set `next_retry_at` with exponential backoff
6. On connectivity lost: pause cycle; resume on reconnect

The sync cycle pauses during payment finalization (a brief mutex/lock) to ensure
no database contention during the most latency-sensitive operation.

### Sync Queue Lifecycle

```
pending → [attempt] → synced
                   → error (attempts < 10) → pending (after next_retry_at)
                   → dead (attempts >= 10) → admin notification + manual resolution
```

### Conflict Handling Strategy

Conflicts occur when the same entity is modified both locally and on the cloud
between sync cycles (e.g., a product price changes remotely while a sale is in progress).

**Resolution**: last-write-wins using `updatedAt` timestamp.
- If local `updatedAt` > remote `updatedAt`: local wins → overwrite remote
- If remote `updatedAt` > local `updatedAt`: remote wins → update local
- Special case for sales: once a sale is `completed` locally, it is immutable locally;
  remote can only add metadata (e.g., `remoteId`), never change financial data.

### Recovery After Crash

On every startup, the POS performs:
1. Check for a `draft` sale in the local DB → restore to Zustand cart store
2. Check for `held` sales → make available in held-sales list
3. Check for `open` shift → restore shift state
4. Check for incomplete sync events in `sync_queue` → resume sync cycle
5. Check for `failed` print jobs → notify cashier that a reprint may be needed

This ensures the cashier can resume exactly where they left off after any crash.

---

## State Management

### POS Cart State (Zustand)

```typescript
interface CartStore {
  items: CartItem[];          // line items with snapshots
  subtotal: Decimal;          // sum of line totals before discount
  invoiceDiscount: Discount | null;
  tax: Decimal;               // calculated from item tax rates
  total: Decimal;             // final payable amount
  draftSaleId: string | null; // persisted draft sale localId

  addItem(product: ProductSnapshot, quantity: number): void;
  removeItem(itemId: string): void;
  updateQuantity(itemId: string, qty: number): void;
  applyItemDiscount(itemId: string, discount: Discount): void;
  applyInvoiceDiscount(discount: Discount): void;
  clearCart(): void;
}
```

All `Decimal` values use the `decimal.js` library to ensure no floating-point errors
in financial calculations. Rounding to display/print uses configured currency precision.

Cart mutations follow this pattern:
1. Update in-memory Zustand store (synchronous)
2. Persist to SQLite `sales` record with `status=draft` (via Tauri IPC, async)
3. Persist `sale_items` records for all current items (upsert)

Persistence is fire-and-forget from the UI perspective; the UI is already updated
before the write completes. On error, the error is logged but not shown to the cashier
unless it persists (retry logic in the Tauri layer).

### Shift State (Zustand)

```typescript
interface ShiftStore {
  currentShift: Shift | null;
  status: 'idle' | 'open' | 'closing';

  openShift(openingCash: Decimal): Promise<void>;
  closeShift(actualCash: Decimal): Promise<ShiftSummary>;
}
```

Shift state is loaded from SQLite on startup. Transitions are SQLite-first.

### Held Sales State (Zustand)

```typescript
interface HeldSalesStore {
  held: HeldSale[];           // max 10 per terminal

  holdCurrentCart(): Promise<string>; // returns hold reference
  resumeSale(holdRef: string): void;
  getHeldList(): HeldSale[];
}
```

Held sales are persisted as `sales` records with `status=held` in SQLite.

### Sync Status State (Zustand)

```typescript
interface SyncStore {
  status: 'online' | 'offline' | 'syncing' | 'error';
  pendingCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
}
```

Sync status is updated by the Tauri background task via Tauri events
(`emit('sync-status', payload)`), which the React frontend listens to via
`listen('sync-status', handler)`.

---

## Database Design

### Local SQLite Schema (Prisma — schema-local.prisma)

All local entities carry sync metadata: `localId`, `remoteId?`, `syncStatus`,
`syncedAt?`, `version`.

**products** — read-only from POS; written by catalog sync
```
localId         String   @id @default(uuid())
remoteId        String?  @unique
barcode         String   @unique
sku             String   @unique
nameAr          String
nameEn          String
price           Decimal
taxRate         Decimal  @default(0)
unit            String
warehouseId     String
isActive        Boolean  @default(true)
syncStatus      String   @default("synced")
syncedAt        DateTime?
updatedAt       DateTime @updatedAt
```
Indexes: `barcode`, `sku`, `nameAr` (FTS5), `nameEn` (FTS5)

**shifts**
```
localId         String   @id @default(uuid())
remoteId        String?
cashierId       String
terminalId      String
openAt          DateTime @default(now())
closeAt         DateTime?
openingCash     Decimal
closingCash     Decimal?
status          String   @default("open")  // open | closed
syncStatus      String   @default("pending")
version         Int      @default(1)
```

**sales**
```
localId         String   @id @default(uuid())
remoteId        String?
shiftId         String
cashierId       String
warehouseId     String
status          String   // draft | held | completed | cancelled | refunded
subtotal        Decimal
invoiceDiscount Decimal  @default(0)
tax             Decimal
total           Decimal
paidCash        Decimal  @default(0)
paidCard        Decimal  @default(0)
changeDue       Decimal  @default(0)
holdRef         String?
receiptNumber   String?  @unique
createdAt       DateTime @default(now())
completedAt     DateTime?
syncStatus      String   @default("pending")
version         Int      @default(1)
```
Indexes: `shiftId`, `status`, `receiptNumber`, `syncStatus`

**sale_items**
```
localId         String   @id @default(uuid())
saleId          String
productLocalId  String
snapshot        Json     // { barcode, sku, nameAr, nameEn, price, taxRate, unit }
quantity        Decimal
unitPrice       Decimal
discount        Decimal  @default(0)
tax             Decimal
lineTotal       Decimal
```

**payments**
```
localId         String   @id @default(uuid())
saleId          String
method          String   // cash | card | split-cash | split-card
amount          Decimal
reference       String?  // card terminal reference
createdAt       DateTime @default(now())
```

**refunds**
```
localId         String   @id @default(uuid())
remoteId        String?
originalSaleId  String
cashierId       String
supervisorId    String
items           Json     // array of { saleItemId, quantity, amount }
total           Decimal
receiptNumber   String   @unique
createdAt       DateTime @default(now())
syncStatus      String   @default("pending")
version         Int      @default(1)
```

**audit_logs** (append-only, never updated)
```
localId         String   @id @default(uuid())
remoteId        String?
userId          String
action          String
entityType      String
entityId        String
warehouseId     String
terminalId      String
beforeState     Json?
afterState      Json?
timestamp       DateTime @default(now())
syncStatus      String   @default("pending")
```
No `updatedAt` — this table is immutable after insert.

**sync_queue**
```
id              String   @id @default(uuid())
entityType      String
entityId        String   // localId of the entity
operation       String   // create | update
payload         Json
priority        Int      @default(5)  // 1=highest (audit), 10=lowest (catalog)
status          String   @default("pending")
attempts        Int      @default(0)
nextRetryAt     DateTime @default(now())
lastError       String?
```

### Price Snapshot Strategy

`sale_items.snapshot` stores a JSON copy of the product at the moment the item is
added to the cart:

```json
{
  "barcode": "6281234567890",
  "sku": "PROD-001",
  "nameAr": "زيت دوار الشمس",
  "nameEn": "Sunflower Oil",
  "price": "12.50",
  "taxRate": "0.15",
  "unit": "bottle"
}
```

This ensures receipts and refunds always show the price the customer actually paid,
regardless of subsequent product price updates.

### Audit Log Strategy

Every sensitive action writes an audit log entry in the same SQLite transaction as
the primary operation. No action is considered complete if the audit log write fails.

Sensitive actions requiring audit entries:
- Sale completed
- Sale cancelled
- Refund issued
- Discount applied (above threshold)
- Shift opened
- Shift closed
- Supervisor PIN used
- Price override

---

## POS Workflow Architecture

### Barcode Scanning Flow

```
[Scanner] emits keystrokes → [Global keydown listener in React]
  → BarcodeBuffer accumulates characters
  → On Enter (or 50ms idle): buffer flushed as barcode string
  → CartService.addByBarcode(barcode)
    → IPC: db_lookup_by_barcode(barcode) → SQLite query (indexed)
    → If found: CartStore.addItem(product, qty=1)
      → Recalculate totals (synchronous, in-memory)
      → Re-render cart (React)
      → IPC: db_persist_draft(cart) [fire-and-forget]
    → If not found: show ProductNotFoundToast (auto-dismiss 3s)
```

Target: barcode-to-cart-update ≤ 200 ms total.
SQLite lookup target: ≤ 5 ms (indexed barcode column).
React render target: ≤ 50 ms.
IPC overhead budget: ≤ 50 ms.

Consecutive scans of the same product: CartStore checks if the product's `localId`
already exists in `items`; if yes, increments quantity rather than creating a duplicate
row (configurable via `MERGE_DUPLICATE_SCANS` constant).

### Cart Lifecycle

```
[idle] → addItem → [has items / draft]
  → applyDiscount (optional)
  → editQuantity (optional)
  → removeItem (optional)
  → holdCart → [held] → resumeSale → [has items / draft]
  → cancelSale + confirm → [cancelled] → [idle]
  → initPayment → [payment in progress]
    → confirmPayment → [completed]
      → printReceipt
      → enqueue sync events
      → clearCart → [idle]
```

Draft sale is persisted to SQLite on every cart mutation.
`draft` → `held` transition: updates sale.status in SQLite, removes from active cart.
`draft` → `completed` transition: the most critical — must be atomic in SQLite
(single transaction: update sale, insert payments, insert audit log, enqueue sync).

### Payment Lifecycle

**Cash payment**:
```
1. cashier enters tendered amount (≥ total)
2. PaymentService.calculateChange(tendered, total)
3. UI shows change due
4. Cashier confirms
5. SQLite transaction:
   - sales.status = 'completed', completedAt = now()
   - sales.paidCash = tendered, changeDue = change
   - sales.receiptNumber = generateReceiptNumber()
   - INSERT payment record (method=cash, amount=tendered)
   - INSERT audit_log (action='sale_completed')
   - INSERT sync_queue events (sale, payment, audit)
6. Trigger receipt print (async)
7. Trigger cash drawer open (async, if supported)
8. Cart cleared
```

**Card payment**:
```
1. PaymentService.initiateCard(total)
2. Tauri IPC → payment terminal driver (serial/USB)
3. Await terminal response (approval/decline)
4. On approval: same SQLite transaction as cash but method=card
5. On decline: show error, leave cart intact, allow retry
6. On timeout (30s): show error, allow retry or fallback to cash
```

**Split payment**:
```
1. Cashier enters cash portion (< total)
2. Card portion = total - cash portion
3. Initiate card for card portion
4. On card approval: SQLite transaction:
   - INSERT payment (method=split-cash, amount=cashPortion)
   - INSERT payment (method=split-card, amount=cardPortion)
   - sale.paidCash = cashPortion, paidCard = cardPortion
   - ...same as above
```

### Refund Lifecycle

```
1. Supervisor or authorized cashier selects "Refund"
2. Enter receipt number
3. IPC: db_lookup_sale_by_receipt(receiptNumber)
   → Search SQLite first
   → If not found: show "Transaction not found locally; sync required" message
4. Show refundable items (items not yet refunded)
5. Cashier selects items and quantities
6. SupervisorAuth.requirePin() → PIN overlay → verify against local hashed PINs
7. On authorized:
   SQLite transaction:
   - INSERT refund record
   - UPDATE sale.status = 'refunded' (if fully refunded)
   - INSERT audit_log (action='refund_issued')
   - INSERT sync_queue (refund, audit)
8. Print refund receipt
```

### Receipt Reprint Lifecycle

```
1. Cashier triggers "Reprint" (last sale or by receipt number)
2. IPC: db_get_sale_snapshot(receiptNumber)
   → Fetch sale + sale_items.snapshot + payments from SQLite
3. ReceiptRenderer.render(snapshot) → generates print data
4. PrintService.print(data)
5. On success: show "Receipt reprinted" toast
6. On failure: show "Printer error" with retry button
```

Authorization check for reprint: configurable in settings. Default: same cashier only,
within current shift. Supervisor can always reprint.

---

## UI Architecture

### Screen Layout Strategy

The main POS screen uses a fixed two-panel layout:

```
┌────────────────────────────────────────────────────────────┐
│ [Sync Status] [Cashier Name] [Shift Info]         [Clock] │  ← Header (60px)
├───────────────────────────────────┬────────────────────────┤
│                                   │                        │
│         CART PANEL (70%)          │   SUMMARY PANEL (30%)  │
│                                   │                        │
│  ┌─────────────────────────────┐  │  Subtotal: 125.00      │
│  │ Product Name    Qty  Price  │  │  Discount:  -10.00     │
│  │ ...             ...  ...   │  │  Tax:        17.25      │
│  │ (virtual list)             │  │  ──────────────────     │
│  └─────────────────────────────┘  │  TOTAL:    132.25      │
│                                   │                        │
│  [Search / Scan input]            │  [CASH] [CARD] [SPLIT] │
│                                   │                        │
│  [HOLD] [CANCEL] [REFUND]         │  [CLOSE SHIFT]         │
├───────────────────────────────────┴────────────────────────┤
│  Keyboard shortcuts legend                                  │  ← Footer (40px)
└────────────────────────────────────────────────────────────┘
```

In RTL (Arabic) mode, the layout mirrors: summary panel is on the left, cart on the right.
Panel widths and the keyboard-first layout are preserved.

No navigation away from this screen during a sale. All overlays (payment, hold, refund,
supervisor PIN) are modal panels rendered over the main screen.

### Keyboard-First Interaction Design

| Key | Action |
|---|---|
| F1 | Focus barcode/search input |
| F2 | Cash payment |
| F3 | Card payment |
| F4 | Split payment |
| F5 | Hold current sale |
| F6 | Resume held sale list |
| F7 | Cancel current sale |
| F8 | Refund |
| F9 | Reprint last receipt |
| F10 | Close shift |
| Enter | Confirm active action |
| Escape | Cancel/dismiss modal |
| ↑ / ↓ | Navigate cart items |
| Delete | Remove selected item |
| + / - | Increase/decrease selected item quantity |

All keyboard shortcuts are rendered in the footer bar for cashier reference.
The search/scan input is auto-focused on startup and re-focused after every action.

### RTL Handling Strategy

- CSS logical properties used throughout (`margin-inline-start` not `margin-left`).
- `dir="rtl"` set on the root `<html>` element based on the active locale.
- The `react-i18next` library manages locale switching; switching locale triggers a
  full root re-render (acceptable since it is not a cashier-flow action).
- All number formatting uses `Intl.NumberFormat` with the active locale.
- Component library: use `shadcn/ui` with Tailwind CSS — both support RTL natively
  via `tailwindcss-rtl` plugin.
- RTL correctness is part of the PR review checklist for every component.

### Error State Handling

Three categories of error display:
1. **Toast** (auto-dismiss, 3s): non-critical info (product not found, reprint success)
2. **Inline** (persists until resolved): cart-level errors (invalid quantity, price calculation error)
3. **Modal** (blocks until dismissed): critical errors (payment terminal error, shift already open)

All error messages use i18n keys. No stack traces or technical details in user-facing text.
Error messages include a clear next-action instruction.

### Loading State Handling

Loading states are shown only for operations with unpredictable duration:
- Card payment terminal response (spinner over payment panel)
- Shift close summary generation (spinner over summary screen)
- Refund lookup (spinner in lookup field)

Synchronous SQLite operations (scan, quantity edit, cash payment) do not show loading
states — they are fast enough that a spinner would flash and cause confusion.

---

## Printing Strategy

### Receipt Printing Architecture

The Tauri app communicates with the thermal printer via the OS printer API (Windows: WinSpool
or ESC/POS commands over USB/COM). The print subsystem runs in the Rust Tauri process.

Print data flow:
```
PaymentService.onSaleComplete(saleId)
  → ReceiptRenderer.render(sale, items, payments)  [TypeScript, in React process]
  → Returns: ReceiptDocument { lines: ReceiptLine[], metadata }
  → IPC: print_receipt(ReceiptDocument)  [Tauri command]
    → Rust: format as ESC/POS byte sequence
    → Send to printer via OS spooler
    → Return: { success: boolean, error?: string }
  → On success: show "Receipt printed" toast
  → On error: store as failed print job in SQLite; show re-print prompt
```

Receipt content is derived from stored sale data (snapshot), not live product lookups.
This ensures reprints are always accurate to the original sale.

### Printer Failure Handling

Sale finalization is atomic and independent of printing:
1. SQLite transaction for sale completion runs first.
2. Print is triggered after the transaction commits.
3. If print fails: sale is finalized; print failure is logged; cashier sees re-print prompt.
4. The failed print job is stored in SQLite (`print_jobs` table) with the sale reference.
5. A persistent "Printer Error" badge appears in the header until the cashier resolves it.

### Deferred Re-Print Flow

```
Cashier resolves printer issue (paper, connection)
  → Taps "Re-Print" badge or presses F9
  → System fetches latest failed print job from SQLite
  → Re-runs print flow
  → On success: mark print job as resolved; clear badge
  → On failure: show error with retry button
```

### Cash Drawer Trigger Flow

```
Cash payment confirmed
  → Rust Tauri: send ESC/POS cash drawer command (0x1B 0x70 0x00 0x19 0xFA)
    over same COM port as receipt printer
  → Fire-and-forget (no blocking; no error shown if drawer fails)
  → Log ESC/POS command result to application log for diagnostics
```

Cash drawer opening is best-effort; it does not affect sale finalization or receipt printing.

---

## Sync Engine

### Queue Structure

Two BullMQ queues:

**`pos-sync-queue`** (main queue):
```typescript
interface SyncJob {
  type: 'sale' | 'shift' | 'refund' | 'audit_log' | 'catalog_pull';
  operation: 'create' | 'update';
  entityLocalId: string;
  warehouseId: string;
  terminalId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string; // `${entityType}:${localId}:${version}`
}
```

Priority mapping (lower number = higher priority):
- `audit_log`: priority 1
- `sale`: priority 2
- `refund`: priority 2
- `shift`: priority 3
- `catalog_pull`: priority 9

**`pos-sync-dlq`** (dead-letter queue):
Jobs moved here after 10 failed attempts. An admin notification is triggered.
Manual resolution via the admin dashboard.

### Retry Mechanism

```typescript
const RETRY_DELAYS = [5, 10, 20, 40, 80, 160, 300, 300, 300, 300]; // seconds
// Cap at 5 minutes (300s), total max ~22 minutes across 10 attempts
```

Each failed job: increment attempts, set `next_retry_at = now() + RETRY_DELAYS[attempts]`,
status = `pending` (not `error` — error is terminal). Job moves to `error` only after
all 10 retries fail.

### Idempotency Strategy

Every sync job carries an `idempotencyKey = ${entityType}:${localId}:${version}`.

The NestJS API stores processed idempotency keys in a Redis set with a 24-hour TTL.
On receiving a sync job:
1. Check `SISMEMBER processed_keys ${idempotencyKey}`
2. If member: return `200 OK` without processing (already done)
3. If not member: process → `SADD processed_keys ${idempotencyKey}`

This ensures safe retry of any failed sync without duplicating data.

### Sync Prioritization

Sync events from the POS SQLite `sync_queue` table are read with:
```sql
SELECT * FROM sync_queue
WHERE status = 'pending' AND next_retry_at <= now()
ORDER BY priority ASC, created_at ASC
LIMIT 50
```

Audit logs are always processed first, then sales/refunds, then shifts.
Catalog pulls (product catalog updates from cloud) are lowest priority and only run
when no pending financial events exist.

### Offline Recovery

On connectivity restored:
1. Rust Tauri detects network change (OS network event or polling `/api/v1/health`)
2. Emit `network-online` event to React frontend → SyncStore.status = 'syncing'
3. Start sync cycle: read `sync_queue` in priority order, upload to API
4. On completion: SyncStore.status = 'online', SyncStore.lastSyncAt = now()

During recovery, the sync processes pending events in batches of 50 to avoid overwhelming
the API when a terminal comes back online after an extended outage.

---

## Security

### Authentication Flow

```
1. Cashier enters username + 4-digit PIN on POS login screen
2. POS sends credentials to NestJS API: POST /api/v1/auth/login
3. API validates, returns { accessToken (15min), refreshToken (7d) }
4. Access token: stored in Zustand memory only (not persisted)
5. Refresh token: stored in OS keychain via Tauri secure storage (tauri-plugin-keychain)
6. On 401 response from API: auto-refresh using refresh token
7. On refresh token expiry: force re-login
```

For offline operation: if the access token is expired and the API is unreachable,
the POS uses the last known valid session from the local auth cache (hashed, in SQLite)
for a maximum of 24 hours. After 24 hours offline, re-authentication is required
(the next time the API is reachable).

### Supervisor PIN Flow

```
1. Action requires supervisor authorization (e.g., above-threshold discount)
2. SupervisorModal renders as an overlay (cashier remains logged in)
3. Cashier or supervisor enters supervisor username + PIN
4. POS verifies against local supervisor PIN cache (hashed with bcrypt, synced from API)
5. On success: action proceeds; audit log records supervisorId
6. On failure: 3 attempts allowed; lockout for 5 minutes after 3 failures
7. Supervisor does NOT need to log out or log in; this is an inline elevation
```

### Role Enforcement Boundaries

RBAC is enforced at two layers:
1. **UI layer** (cosmetic): hides or disables buttons the user cannot access
2. **Tauri IPC layer** (enforcement): every IPC command handler checks the active user's
   role from the local auth cache before executing

Roles are defined as an enum in `packages/shared/src/constants/roles.ts`:
```
CASHIER: scan, cart, cash/card/split payment, receipt print, hold, cancel (own sales)
SUPERVISOR: all CASHIER + above-threshold discounts, refunds, close any shift
ADMIN: all SUPERVISOR + product management, user management (admin dashboard only)
```

Role data is embedded in the JWT access token claims and cached locally.
The NestJS API enforces roles on all sync/ingestion endpoints using NestJS Guards.

---

## Performance Strategy

### Product Search Optimization

Two search paths:
1. **Barcode/SKU lookup**: `SELECT * FROM products WHERE barcode = ?` — O(1) with B-tree index.
2. **Name search**: SQLite FTS5 virtual table mirroring `products.nameAr` and `products.nameEn`.

FTS5 setup:
```sql
CREATE VIRTUAL TABLE products_fts USING fts5(
  name_ar, name_en,
  content='products', content_rowid='rowid'
);
```
Kept in sync via triggers on `products` INSERT/UPDATE/DELETE.

Name search query:
```sql
SELECT p.* FROM products p
JOIN products_fts fts ON p.rowid = fts.rowid
WHERE products_fts MATCH ? || '*'
LIMIT 20
```
Target: ≤ 50 ms for any name query on 50,000 products.

### Barcode Lookup Optimization

- `CREATE UNIQUE INDEX idx_products_barcode ON products(barcode)` — primary lookup index.
- `CREATE UNIQUE INDEX idx_products_sku ON products(sku)` — SKU fallback.
- Both lookups target ≤ 5 ms on 50,000 rows.
- Barcode scanner input is debounced with a 50 ms trailing window to handle multi-segment
  barcodes (e.g., GS1-128 with multiple application identifiers).

### SQLite Indexing Strategy

Critical indexes (beyond the above):
```sql
-- Shift and sale lookups
CREATE INDEX idx_sales_shift_id ON sales(shift_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_receipt_number ON sales(receipt_number);
CREATE INDEX idx_sync_queue_status_priority ON sync_queue(status, priority, next_retry_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

SQLite WAL mode enabled: `PRAGMA journal_mode=WAL` — allows concurrent reads while
sync writes are in progress, preventing UI freezes during background sync.

### UI Rendering Optimization

- Cart list: `react-virtual` (TanStack Virtual) for lists exceeding 50 items.
- Cart total recalculation: runs in a Zustand selector, not a React effect — triggers
  only on relevant slice changes, not full store changes.
- Avoid `useEffect` for synchronous calculations; use derived state via Zustand selectors.
- All Zustand selectors use shallow equality to prevent spurious re-renders.
- Receipt renderer: pure TypeScript function (no React) — renders to a plain object,
  no DOM involvement.

---

## Testing Strategy

### Unit Testing Scope (Vitest)

- `packages/shared/src/errors/AppError.ts` — error hierarchy construction and serialization
- `packages/shared/src/utils/currency.ts` — decimal arithmetic, rounding, change calculation
- `packages/sync/src/conflicts.ts` — all conflict resolution cases (local wins, remote wins, tie)
- `packages/sync/src/idempotency.ts` — key generation, deduplication logic
- `packages/sync/src/retry.ts` — backoff intervals, attempt counting, DLQ threshold
- `apps/api/src/*/services/*.service.ts` — all NestJS service business logic
- `apps/pos/src/services/*.ts` — CartService, PaymentService, RefundService (pure functions)

Coverage target: ≥ 70% for all of the above modules.

### Integration Testing Scope (Jest + Supertest + real PostgreSQL)

- `apps/api/src/auth/**` — login, token refresh, logout
- `apps/api/src/sync/**` — all sync ingestion endpoints; verify idempotency
- `apps/api/src/products/**` — catalog pull, pagination, filtering
- `apps/api/src/shifts/**` — shift open/close ingestion
- `apps/api/src/sales/**` — sale ingestion, conflict scenarios

Integration tests use a real PostgreSQL instance (Docker Compose `test` service).
No mocking of the database layer (per Constitution Principle X).

### E2E Cashier Workflow Coverage (Playwright + Tauri WebDriver)

Five mandatory E2E flows:

1. **Standard cash sale**:
   Scan 3 products → verify cart totals → cash payment → enter tendered amount →
   verify change shown → confirm → verify receipt printed → verify sale in SQLite

2. **Cancel transaction**:
   Scan 2 products → cancel with confirmation → verify cart empty → verify no sale record

3. **Manual SKU entry**:
   Type SKU manually → verify product found → add to cart → card payment → confirm

4. **Refund flow**:
   Complete a sale → trigger refund → enter receipt number → select 1 item for partial
   refund → supervisor PIN → confirm → verify refund receipt → verify refund record

5. **Shift open and close**:
   Open shift with opening cash → scan and complete 2 sales → close shift → verify
   reconciliation summary shows correct totals

---

## Deployment Considerations

### Desktop Packaging

Tauri builds produce platform-native installers:
- **Windows**: `.exe` NSIS installer (primary target)
- Signing: EV code-signing certificate required for Windows; unsigned builds are
  development-only
- Auto-update: Tauri updater plugin configured to check the update server on startup
- Distribution: internal update server or CDN-hosted update manifest

Build pipeline (GitHub Actions):
```
push to main → CI → run tests → tauri build → sign .exe → upload to update server
```

### Local DB Migrations

SQLite schema migrations run automatically on POS app startup:
1. App launches → Tauri Rust process checks `PRAGMA user_version`
2. If version < expected: run pending migrations in order
3. Migrations are embedded in the Rust binary as compiled SQL strings
4. On migration failure: show error dialog; prevent app from starting (safety gate)
5. Backup of the SQLite file is created before each migration run

Cloud PostgreSQL migrations (NestJS):
- `prisma migrate deploy` runs in the Dockerfile entrypoint before the server starts
- Migrations must be backwards-compatible (additive only — no column drops in a single step)

### Environment Management

Three environments with identical Docker images:

| Variable | Dev | Staging | Production |
|---|---|---|---|
| `DATABASE_URL` | local postgres | staging postgres | prod postgres |
| `REDIS_URL` | local redis | staging redis | prod redis |
| `JWT_SECRET` | dev secret | secrets manager | secrets manager |
| `NODE_ENV` | development | production | production |

`.env` files are in `.gitignore`. Staging and production secrets are managed via
environment secrets in the CI/CD system (GitHub Actions secrets or cloud secrets manager).

POS app environment config is bundled at build time for the target environment using
Tauri's `env` feature in `tauri.conf.json`. No `.env` files are shipped with the installer.

---

## Error Handling Architecture

### AppError Hierarchy (packages/shared)

```
AppError (base)
├── ValidationError     (400) — invalid input, field-level details
├── AuthError           (401) — authentication failure
├── PermissionError     (403) — RBAC violation
├── NotFoundError       (404) — entity does not exist
├── ConflictError       (409) — duplicate, concurrent modification
├── SyncError           (500) — sync engine failure, goes to DLQ
├── PrintError          (500) — printer failure, triggers re-print flow
└── CriticalError       (500) — requires immediate human attention
```

`CriticalError` triggers: audit log entry with `CRITICAL` severity + admin notification
via the sync engine (posted to API when online, queued when offline).

### Network Error Containment

All sync-related network calls are wrapped in the sync worker, never in the React UI layer.
The React UI never makes direct HTTP calls to the NestJS API for operational actions.
The only direct API call from the React layer is the authentication endpoint (login/refresh).

---

## Internationalization Architecture

### i18n Key Convention

Pattern: `<screen>.<component>.<key>` (e.g., `pos.cart.itemAdded`, `shift.close.totalSales`)

Translation files:
- `apps/pos/src/i18n/ar.json` (primary)
- `apps/pos/src/i18n/en.json` (secondary)

Library: `react-i18next`. Locale is stored in Zustand and in SQLite settings.
Default locale: `ar` (Arabic).

### RTL Enforcement

- HTML root: `<html dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>`
- Tailwind: `tailwindcss-rtl` plugin for logical property utilities
- CSS: never use `left`/`right` directly — use `start`/`end` logical properties
- Icons: directional icons (arrows, back/forward) must be mirrored in RTL; use CSS transform
  or `scale-x-[-1]` class

---

## Phase 0 Research Output

See `research.md` for all technology decisions with rationale.

## Phase 1 Design Output

See:
- `data-model.md` — complete entity specifications
- `contracts/api-auth.md`, `contracts/api-sync.md`, `contracts/api-products.md`
- `quickstart.md` — developer setup guide
