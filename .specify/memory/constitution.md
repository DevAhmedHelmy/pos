# Supermarket POS System Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

* TypeScript strict mode MUST be enabled in every package and app (no `strict: false`).
* The `any` type is FORBIDDEN without an explicit inline comment justifying the exception.
* ESLint and Prettier MUST be configured at the monorepo root and enforced in CI; PRs failing
  lint MUST NOT be merged.
* Functions MUST be single-purpose and SHOULD stay under 50 lines; exceeding this requires
  a reviewer sign-off comment explaining why the size is justified.
* Dead code, commented-out code, and untracked `TODO` comments are FORBIDDEN in merged code;
  all TODOs MUST reference a tracked issue number (e.g., `// TODO(#42): ...`).
* No magic strings or magic numbers — all constants MUST be named and exported from a
  dedicated constants file.

**Rationale**: A POS codebase touched by multiple developers over years degrades fast without
enforced quality gates. Strict TypeScript catches whole classes of sync and data bugs at
compile time, which is critical for an offline-first system.

---

### II. Architecture

* The project MUST be structured as a Turborepo monorepo with the following top-level layout:

  * `apps/pos`   — Tauri desktop POS application
  * `apps/admin` — Next.js web admin dashboard
  * `apps/api`   — NestJS backend API
  * `packages/shared` — shared TypeScript types, constants, and utilities
  * `packages/db`     — Prisma schema, migrations, and generated clients
  * `packages/sync`   — offline sync engine (queue logic, conflict resolution)

* The system architecture MUST follow a Modular Monolith approach for v1.

* Microservices are explicitly FORBIDDEN before scaling requirements justify the complexity.

* Modules MUST communicate internally through services and shared contracts.

* Dependency direction is STRICTLY one-way: apps depend on packages; packages MUST NOT
  import from apps.

* Circular dependencies between packages are FORBIDDEN and enforced via `eslint-plugin-import`.

* Each app and package MUST have its own `package.json`, `tsconfig.json`, and test setup.

* No business logic is permitted in UI components; components call services, services own logic.

**Rationale**: A clear monorepo boundary prevents the coupling that makes offline-sync bugs
impossible to isolate and test. The dependency-direction rule is the architectural firewall
that keeps the sync engine independently testable.

---

### III. Offline-First Behavior (NON-NEGOTIABLE)

* The POS application MUST be fully functional for all cashier operations with zero network
  connectivity — this is a hard requirement, not a nice-to-have.
* SQLite (via Prisma) is the single source of truth for the local POS app; all reads and
  writes go to SQLite first.
* Every write operation (sale, refund, inventory adjustment) MUST be committed to SQLite
  and enqueued for sync BEFORE any success response is shown to the cashier.
* Sync operations MUST run in the background and MUST NEVER interrupt active cashier workflows.
* The cashier UI MUST NEVER block, spinner-wait, or display errors caused by network
  conditions. Network errors are invisible to cashiers and handled by the sync layer.
* The POS app MUST detect connectivity changes and update a non-intrusive status indicator
  (online/offline badge) without disrupting active transactions.
* Receipt printing MUST work offline using local data; no remote call is required to print.

**Rationale**: Supermarkets cannot afford a POS that stops working when the internet goes
down. Even a 30-second outage during peak hours causes queue backups and revenue loss.

---

### IV. Sync Engine

* BullMQ + Redis MUST be used as the sync queue for all cloud sync operations.
* Every entity subject to sync MUST carry these fields:

  * `localId`
  * `remoteId`
  * `syncStatus`
  * `syncedAt`
  * `version`
* Conflict resolution strategy MUST be last-write-wins using `updatedAt` timestamps.
* Sync failures MUST be retried with exponential backoff.
* Sync MUST be idempotent: re-processing the same sync event MUST NOT create duplicates.
* Dead-letter queue items MUST trigger an admin notification and require manual resolution.

**Rationale**: The sync engine is the most failure-prone component. Idempotency and retry
strategies prevent data duplication and recovery failures.

---

### V. Database Design

* Local database: SQLite via Prisma.

* Cloud database: PostgreSQL via Prisma.

* All tables MUST include:

  * `id`
  * `createdAt`
  * `updatedAt`
  * `deletedAt`

* Hard deletes are FORBIDDEN.

* Multi-warehouse support MUST exist from day one.

* Monetary values MUST use decimal types and MUST NEVER use floating point numbers.

* UUID primary keys MUST be used everywhere.

* Database migrations MUST be backward-compatible.

**Rationale**: Financial systems require accuracy, traceability, and future scalability.

---

### VI. API Design

* All API routes MUST be versioned under `/api/v1/`.
* All API responses MUST follow a consistent response envelope.
* Pagination MUST be cursor-based.
* DTO validation using `class-validator` is mandatory.
* Authentication MUST use JWT + refresh token rotation.
* RBAC MUST be enforced server-side.
* OpenAPI/Swagger documentation MUST be auto-generated.

**Rationale**: Predictable APIs simplify synchronization and frontend integration.

---

### VII. UI/UX Standards

* Arabic RTL is the primary UI direction.

* Every cashier flow MUST support keyboard-only interaction.

* Common cashier operations MUST require minimal interaction steps.

* All screens MUST implement:

  * loading state
  * error state
  * empty state

* The sync status MUST always be visible.

* Receipt and barcode layouts MUST match printer dimensions exactly.

**Rationale**: POS speed and usability directly affect business performance.

---

### VIII. Security

* Secrets MUST exist only in environment variables.
* Raw SQL queries are FORBIDDEN unless reviewed.
* All API routes require authentication unless explicitly public.
* RBAC roles MUST be enforced server-side.
* All financial operations MUST generate immutable audit logs.
* Dependency security audits MUST run in CI.

**Rationale**: POS systems manage financial and operationally sensitive data.

---

### IX. Performance

* POS barcode scan-to-cart addition SHOULD target under 200ms on recommended hardware.
* POS transaction completion SHOULD target under 500ms.
* Admin dashboard initial load SHOULD target under 2 seconds.
* SQLite queries MUST be indexed.
* The sync engine MUST process reconnect backlogs efficiently.

**Rationale**: Performance is a core business requirement in supermarket environments.

---

### X. Testing

* Critical business logic MUST have automated test coverage.
* Integration tests MUST cover API endpoints.
* E2E tests MUST cover critical cashier workflows.
* Tests MUST run in CI on every PR.
* SQLite MUST be used for local database testing.

**Rationale**: Offline sync and cashier flows require reliable automated verification.

---

### XI. Error Handling

* All errors MUST use shared typed error classes.
* Network failures MUST be handled by the sync engine.
* User-facing errors MUST be localized and actionable.
* Critical failures MUST be logged and visible to operators.
* API error codes MUST remain consistent.

**Rationale**: Cashiers should never deal with technical implementation details.

---

### XII. Logging & Audit Trails

* All financial operations MUST generate immutable audit logs.

* Audit logs MUST include:

  * userId
  * action
  * entityType
  * entityId
  * beforeState
  * afterState
  * timestamp
  * warehouseId
  * deviceId

* Audit records MUST NOT be editable or deletable.

* Logs MUST use structured JSON format.

* Centralized log aggregation is REQUIRED in production.

**Rationale**: Financial traceability is mandatory for operational integrity.

---

### XIII. Internationalization

* All UI strings MUST use i18n translation keys.
* Arabic (`ar`) is primary.
* English (`en`) is secondary.
* RTL layout correctness is mandatory.
* Date, time, numbers, and currency formatting MUST respect locale.

**Rationale**: Arabic-speaking users are the primary target audience.

---

### XIV. Deployment

* Backend and admin dashboard MUST be containerized with Docker.
* Tauri apps MUST be distributed as signed installers.
* Dev/staging/prod environments MUST use identical images.
* Zero-downtime API deployment SHOULD be supported.
* Automated smoke tests are required after deployment.

**Rationale**: Consistent deployment environments reduce operational risk.

---

### XV. Git Workflow

* Branch naming conventions:

  * `feature/...`
  * `fix/...`
  * `chore/...`

* Conventional Commits are mandatory.

* `main` branch is protected.

* PR review is required before merge.

* CI failures block merges.

**Rationale**: Clean git workflows improve long-term maintainability.

---

### XVI. Spec-Driven Development (NON-NEGOTIABLE)

* `spec.md` MUST describe WHAT and WHY only.
* `plan.md` MUST describe HOW and technical implementation.
* `tasks.md` MUST contain actionable implementation tasks.
* Implementation MUST NOT begin before spec approval.
* Plan approval is required before implementation.
* Spec, plan, and tasks MUST stay synchronized.

**Rationale**: Spec-driven development reduces implementation drift and architectural chaos.

---

## Technology Stack & Architecture Decisions

| Layer           | Technology     |
| --------------- | -------------- |
| Desktop POS     | Tauri          |
| Admin Dashboard | Next.js        |
| Backend API     | NestJS         |
| Local Database  | SQLite         |
| Cloud Database  | PostgreSQL     |
| ORM             | Prisma         |
| Queue & Cache   | Redis + BullMQ |
| Monorepo        | Turborepo      |
| Language        | TypeScript     |

---

## Development Workflow

1. Specify (`spec.md`)
2. Plan (`plan.md`)
3. Tasks (`tasks.md`)
4. Implement
5. Review
6. Merge

No phase may be skipped.

---

## Governance

* This constitution overrides all informal conventions.
* Amendments require PR review.
* Constitution violations block merges.
* Compliance reviews SHOULD occur regularly.

**Version**: 1.1.0
**Ratified**: 2026-05-08
**Last Amended**: 2026-05-08
