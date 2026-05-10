# Feature Specification: Core POS MVP

**Feature Branch**: `001-core-pos-mvp`  
**Created**: 2026-05-08  
**Status**: Draft

---

# Overview

The Core POS MVP is the foundational cashier-facing module of the supermarket point-of-sale system.

It provides everything required for a cashier to complete the full transaction lifecycle:

- Open a shift
- Scan products
- Build and manage a cart
- Apply discounts
- Accept payments
- Print receipts
- Process refunds
- Close shifts

The system must remain fully operational without internet connectivity.

This feature is the foundation of the entire supermarket platform. Inventory, reporting, synchronization, and multi-branch management all depend on the reliability and speed of this POS workflow.

---

# User Stories

## User Story 1 — Shift Management (P1)

A cashier opens a shift before processing transactions and closes it at the end of their work period.

### Acceptance Criteria

- Cashier can open a shift with opening cash amount.
- Only one active shift per terminal.
- Shift close shows reconciliation summary.
- Shift operations work offline.

---

## User Story 2 — Product Scanning & Cart Management (P1)

A cashier scans barcodes or searches products manually to build a customer cart.

### Acceptance Criteria

- Barcode scans instantly add products.
- Unknown barcode shows clear error.
- Quantity editing works instantly.
- Removing items recalculates totals immediately.
- Product search supports:
  - barcode
  - SKU
  - partial name

---

## User Story 3 — Discounts (P2)

Cashiers or supervisors apply discounts to products or invoices.

### Acceptance Criteria

- Item-level discount supported.
- Invoice-level discount supported.
- Above-threshold discounts require supervisor approval.
- Discounts update totals instantly.

---

## User Story 4 — Payment & Receipt Printing (P1)

Cashier completes payment and prints receipt.

### Acceptance Criteria

- Cash payment supported.
- Card payment supported.
- Split payment supported.
- Receipt printing automatic after successful payment.
- Payment works offline.
- Failed printing does not cancel sale.

---

## User Story 5 — Hold & Resume Sales (P2)

Cashier can hold incomplete sales and resume them later.

### Acceptance Criteria

- Hold current cart.
- Resume held cart.
- Multiple held carts supported.
- Cancel current sale.

---

## User Story 6 — Refund Processing (P2)

Authorized staff can process refunds against previous receipts.

### Acceptance Criteria

- Refund lookup by receipt number.
- Partial refunds supported.
- Duplicate refunds prevented.
- Refunds require authorization.

---

# Functional Requirements

## Shift Management

- **FR-001**: Cashiers MUST open shifts before sales.
- **FR-002**: Only one shift MAY exist per terminal.
- **FR-003**: Shift close MUST provide reconciliation summary.
- **FR-004**: Shift open/close MUST work offline.

---

## Product Discovery

- **FR-005**: Barcode scan MUST add product within 200ms.
- **FR-006**: Unknown barcode MUST show clear error.
- **FR-007**: Product search MUST support:
  - barcode
  - SKU
  - partial name
- **FR-008**: Search results MUST appear in real-time.

---

## Cart Management

- **FR-009**: Cashier MUST add/remove/edit cart items.
- **FR-010**: Totals MUST recalculate instantly.
- **FR-011**: Cart MUST display:
  - product name
  - quantity
  - price
  - discounts
  - totals

- **FR-012**: System MUST persist exact product price, tax, and discount snapshot at sale finalization.

- **FR-013**: Consecutive barcode scans SHOULD increase quantity instead of creating duplicate rows when product merging is enabled.

---

## Discounts

- **FR-014**: Item-level discounts MUST support percentage and fixed values.
- **FR-015**: Invoice-level discounts MUST support percentage and fixed values.
- **FR-016**: Above-threshold discounts MUST require supervisor authorization.
- **FR-017**: Applied discounts MUST appear on receipts.

---

## Payments

- **FR-018**: Cash payments MUST support change calculation.
- **FR-019**: Card payments MUST be supported.
- **FR-020**: Split payments MUST be supported.
- **FR-021**: Sale MUST persist locally before receipt printing.
- **FR-022**: Empty carts MUST NOT allow payment.
- **FR-023**: Cash drawer SHOULD open automatically after successful cash payment when supported hardware exists.

---

## Receipt Printing

- **FR-024**: Receipt printing MUST trigger automatically after successful payment.
- **FR-025**: Receipt re-printing MUST support authorization/time restrictions.
- **FR-026**: Receipts MUST include:
  - store info
  - cashier
  - timestamp
  - items
  - discounts
  - totals
  - taxes
  - payment method
  - transaction number

- **FR-027**: Printer failures MUST NOT cancel completed sales.

---

## Hold & Resume

- **FR-028**: Cashiers MUST hold incomplete carts.
- **FR-029**: Held sales MUST be resumable.
- **FR-030**: System MUST support multiple held sales.
- **FR-031**: Sale cancellation MUST require confirmation.

---

## Refunds

- **FR-032**: Refunds MUST support receipt lookup.
- **FR-033**: Partial refunds MUST be supported.
- **FR-034**: Duplicate refunds MUST be prevented.
- **FR-035**: Refunds MUST require authorization.

---

## Offline Behavior

- **FR-036**: All cashier operations MUST work offline.
- **FR-037**: Sync status MUST always be visible.
- **FR-038**: Offline transactions MUST sync automatically after reconnection.
- **FR-039**: Product catalog updates MUST occur in background sync.
- **FR-040**: Active cart state MUST recover after unexpected application shutdown.
- **FR-041**: Background synchronization MUST pause during payment finalization to prioritize cashier responsiveness.

---

## Role-Based Access

- **FR-042**: Sensitive operations MUST require role permissions.
- **FR-043**: Supervisor approval MAY use PIN authentication without logout.

---

# Non-Functional Requirements

- **NFR-001**: Scan-to-cart update under 200ms.
- **NFR-002**: Payment finalization under 500ms.
- **NFR-003**: Full Arabic RTL support required.
- **NFR-004**: Full keyboard-only cashier workflow required.
- **NFR-005**: System MUST remain stable for 12+ hours continuous operation.
- **NFR-006**: Product catalog MUST support 50,000+ products.
- **NFR-007**: Financial calculations MUST use decimal precision only.
- **NFR-008**: All UI strings MUST support Arabic and English.

---

# Success Criteria

- **SC-001**: Standard sale completed under 60 seconds.
- **SC-002**: 500+ transactions per terminal daily without degradation.
- **SC-003**: Offline transactions sync successfully after reconnection.
- **SC-004**: Full keyboard-only operation supported.
- **SC-005**: Arabic-first workflow fully usable.
- **SC-006**: Receipt printing success rate ≥ 99%.
- **SC-007**: Product lookup under 5 seconds maximum.

---

# Edge Cases

- Zero-stock products scanned.
- Insufficient cash entered.
- Card terminal timeout.
- Malformed barcode input.
- 100% discount authorization.
- Held sales during shift close.
- Duplicate refund attempts.
- Price changes during active cart.
- Terminal clock drift.

---

# Offline Behavior

- Local database is the operational source of truth.
- All writes occur locally first.
- Sync occurs automatically in background.
- Cashiers MUST continue working during sync failures.
- Sync errors MUST notify managers without interrupting cashier workflow.
- Application crashes MUST restore active carts automatically.

---

# Error Scenarios

| Scenario | Behavior |
|---|---|
| Unknown barcode | Show product not found |
| Printer offline | Finalize sale + allow re-print |
| Card timeout | Retry or switch payment |
| Insufficient payment | Block finalization |
| Duplicate refund | Prevent duplicate |
| Supervisor required | Prompt for PIN |
| Sync error | Show sync error badge |
| Empty cart payment | Disable payment |

---

# UX Expectations

- Cart always visible.
- Arabic RTL-first UI.
- Keyboard-first workflow.
- High-contrast readable totals.
- Non-intrusive sync status indicator.
- Fast supervisor approval overlay.
- Simple actionable error messages.
- One-key held-sale access.

---

# Performance Expectations

- Barcode scan response under 200ms.
- Cart recalculation under 100ms.
- Search results under 300ms.
- Payment completion under 500ms.
- Cold app start under 5 seconds.
- Shift summary under 3 seconds.

---

# Assumptions

- Barcode scanner available.
- Thermal receipt printer available.
- Card integrations MAY support local terminals or cloud providers.
- Product catalog pre-synced locally.
- One warehouse per terminal.
- Tax rules pre-configured.
- Single currency system.

---

# Out of Scope

The following are NOT included in this feature:

- Inventory management
- Product management
- Loyalty systems
- Promotions engine
- Multi-currency
- QR/mobile wallet payments
- Customer-facing displays
- Government tax integrations
- Cross-branch reporting
- Hardware setup/configuration