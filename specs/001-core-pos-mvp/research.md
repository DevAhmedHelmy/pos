# Research: Core POS MVP

**Feature**: 001-core-pos-mvp
**Date**: 2026-05-08

This document records all technology decisions made during Phase 0 planning, including
rationale and alternatives considered.

---

## Decision 1: Tauri 2.x for Desktop POS App

**Decision**: Use Tauri 2.x (Rust + WebView2) for the desktop POS application.

**Rationale**:
- Produces small, native binaries (~15MB) vs Electron (~150MB) — critical for supermarket
  POS hardware that may have limited disk space.
- Ships with the OS WebView (Edge/WebView2 on Windows) — no bundled Chromium.
- Native OS APIs: system tray, OS keychain, serial/USB for printer/card terminal, native
  file dialogs.
- Rust backend provides memory safety and predictable performance for database and IPC ops.
- TypeScript frontend allows sharing types with `packages/shared`.

**Alternatives considered**:
- Electron: Rejected — binary size, memory usage, and security surface area too large for
  a dedicated POS terminal.
- Flutter desktop: Rejected — no TypeScript, cannot share Prisma schema or types with the
  API and admin dashboard.
- Pure web app (browser): Rejected — cannot access local SQLite, USB printers, or card
  terminals without a native bridge.

---

## Decision 2: React 18 + Zustand for POS Frontend

**Decision**: React 18 with Zustand 4 for state management in the Tauri WebView.

**Rationale**:
- React 18 concurrent features (useTransition, Suspense) help keep the UI responsive
  during background sync events.
- Zustand is minimal (2KB), synchronous by default, and integrates well with Tauri's
  event system — no async action dispatchers needed for local state.
- Larger ecosystem than Solid.js or Svelte for RTL/i18n libraries.

**Alternatives considered**:
- Svelte: Lighter, but fewer RTL and i18n integrations; team familiarity lower.
- Vue 3: Viable, but React was chosen for type safety uniformity with NestJS decorators.
- Redux Toolkit: Rejected — too much boilerplate for a single-screen POS app with
  straightforward state transitions.

---

## Decision 3: SQLite via better-sqlite3 Sidecar

**Decision**: Use Prisma with `better-sqlite3` driver via a Node.js Tauri sidecar process
for local SQLite access.

**Rationale**:
- Allows sharing the Prisma schema between local SQLite and cloud PostgreSQL with minimal
  duplication — only provider and some type adjustments differ.
- `better-sqlite3` is synchronous, which simplifies the Tauri sidecar's IPC model: each
  command is a synchronous function call, no async plumbing needed in Rust.
- WAL mode enabled by default for concurrent read/write access during background sync.

**Alternatives considered**:
- Direct Rust SQLite via `rusqlite`: Better performance but cannot share Prisma schema;
  requires writing SQL migrations manually. Reserved as a performance escape hatch if
  benchmarks fail.
- Prisma with Rust's `prisma-client-rust`: Experimental at time of decision; not production-ready.

---

## Decision 4: BullMQ + Redis for Sync Queue

**Decision**: BullMQ 5 with Redis 7 as the sync queue for cloud sync.

**Rationale**:
- BullMQ provides job priority, retry with backoff, dead-letter queues, and rate limiting
  out of the box — all required by the sync engine design.
- Redis persistence (AOF) ensures no sync jobs are lost on server restart.
- BullMQ's job deduplication via `jobId` supports the idempotency strategy.

**Alternatives considered**:
- RabbitMQ: More complex to operate; no built-in priority queues in the free tier.
- AWS SQS: Cloud-only; requires internet for all queue operations. Rejected because the
  sync worker runs server-side, but the architecture should be deployable on-premise.
- Simple DB polling table (PostgreSQL): Simpler but lacks retry logic, priorities, and DLQ;
  would require reimplementing BullMQ features manually.

---

## Decision 5: Prisma ORM for Both SQLite and PostgreSQL

**Decision**: Prisma 5 with two schema files: `schema-local.prisma` (SQLite) and
`schema.prisma` (PostgreSQL).

**Rationale**:
- Single ORM for both databases eliminates cognitive overhead of learning two query builders.
- Prisma's type-safe generated client prevents SQL injection and runtime type errors.
- Prisma Migrate handles both local and cloud migrations.
- `packages/db` exposes two clients: `localDb` (SQLite, used in Tauri sidecar) and
  `cloudDb` (PostgreSQL, used in NestJS API).

**Alternatives considered**:
- Drizzle ORM: Faster query execution, but SQLite + PostgreSQL dual-schema support is less
  mature; migration tooling is less battle-tested.
- TypeORM: Verbose entity definitions; historically worse SQLite support.
- Raw SQL: Rejected — violates Constitution Principle VIII (SQL injection prevention).

---

## Decision 6: decimal.js for Financial Arithmetic

**Decision**: Use `decimal.js` for all financial calculations in the POS and API.

**Rationale**:
- JavaScript's `number` type uses IEEE 754 floating-point arithmetic, which produces
  incorrect results for currency (e.g., `0.1 + 0.2 !== 0.3`).
- `decimal.js` provides arbitrary-precision decimal arithmetic and configurable rounding.
- Prisma maps `Decimal` fields to `decimal.js` objects automatically.

**Alternatives considered**:
- `dinero.js`: Currency-aware but opinionated about locale formatting; less flexible for
  multi-locale amounts. Considered for display layer only.
- Integer arithmetic (store amounts in fils/halalas): Viable but requires all code to
  consistently use the minor unit — error-prone across multiple developers.

---

## Decision 7: react-i18next for Internationalization

**Decision**: `react-i18next` with `i18next` for POS and admin dashboard i18n.

**Rationale**:
- De facto standard in the React ecosystem; best RTL support documentation.
- Supports namespace-based key organization (`pos`, `admin`, `shared`).
- Lazy loading of translation files per namespace.
- `i18next-browser-languagedetector` for initial locale detection.

**Alternatives considered**:
- `react-intl` (FormatJS): More complex API; less used with Tauri.
- Fluent (Mozilla): Powerful but niche; limited community resources for Arabic support.

---

## Decision 8: ESC/POS for Receipt and Cash Drawer

**Decision**: Use ESC/POS command protocol over USB/COM for thermal receipt printing and
cash drawer control.

**Rationale**:
- ESC/POS is the industry standard for thermal receipt printers; supported by all major
  brands (Epson, Star, Bixolon, etc.).
- Commands are simple byte sequences that can be composed in Rust and sent via the OS
  serial/USB API.
- No printer-specific SDK required — vendor-neutral implementation.

**Alternatives considered**:
- Windows WinSpool API (GDI printing): OS-level abstraction but requires page layout in
  GDI; harder to control receipt formatting precisely.
- Node.js `node-thermal-printer`: Would run in the Tauri sidecar but adds a dependency
  for a simple byte-sequence operation.

---

## Decision 9: Playwright + Tauri WebDriver for E2E Tests

**Decision**: Playwright with Tauri's WebDriver bridge for E2E testing of the POS app.

**Rationale**:
- Tauri 2.x supports WebDriver via the `tauri-driver` binary, allowing Playwright to
  control the app as if it were a browser.
- Playwright provides cross-platform E2E testing with excellent async/await API.
- Allows testing keyboard-first flows programmatically.

**Alternatives considered**:
- Cypress: No native Tauri support; browser-only.
- Selenium: Older API; less ergonomic than Playwright for modern async flows.

---

## Decision 10: shadcn/ui + Tailwind CSS for POS UI

**Decision**: `shadcn/ui` component library with Tailwind CSS for the POS React frontend.

**Rationale**:
- Components are copied into the project (not a dependency) — full control over RTL
  customization without waiting for upstream library updates.
- Tailwind CSS logical properties (`ps-4`, `pe-4`, `ms-auto`) support RTL natively via
  `tailwindcss-rtl` plugin.
- `shadcn/ui` uses Radix UI primitives which are accessible and keyboard-navigable
  by default — critical for the keyboard-first cashier workflow.

**Alternatives considered**:
- MUI (Material UI): Heavy bundle; RTL support requires `jss-rtl` plugin setup that is
  complex to configure with Tailwind.
- Ant Design: Good RTL support but very large bundle; opinionated styling conflicts with
  POS-specific design requirements.