# Developer Quickstart: Core POS MVP

**Feature**: 001-core-pos-mvp
**Date**: 2026-05-08

This guide gets a developer from zero to a running local development environment
for the Core POS MVP in under 30 minutes.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm` |
| Rust | 1.77+ (stable) | https://rustup.rs |
| Docker Desktop | Latest | https://docker.com |
| Git | 2.40+ | https://git-scm.com |

**Windows only**: Install WebView2 Runtime (usually pre-installed on Windows 11).

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd pos
pnpm install          # installs all workspace packages
```

---

## 2. Environment Setup

Copy environment templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/pos/src-tauri/.env.example apps/pos/src-tauri/.env
```

Edit `apps/api/.env` — minimum required values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret
NODE_ENV=development
```

---

## 3. Start Infrastructure

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379
- Redis Commander (UI) on port 8081

---

## 4. Database Setup

Run cloud migrations (PostgreSQL):

```bash
cd packages/db
pnpm prisma migrate dev --schema prisma/schema.prisma
pnpm prisma db seed             # seed demo products and users
```

The seed creates:
- 1 warehouse (`WH01`)
- 3 users: `cashier01` (PIN: 1234), `supervisor01` (PIN: 5678), `admin01` (PIN: 9999)
- 100 sample products with barcodes

---

## 5. Start the API

```bash
cd apps/api
pnpm dev              # starts NestJS on port 3000 with hot-reload
```

Verify: `curl http://localhost:3000/api/v1/health` → `{ "status": "ok" }`

Swagger UI: http://localhost:3000/api/docs

---

## 6. Start the Admin Dashboard

```bash
cd apps/admin
pnpm dev              # starts Next.js on port 3001
```

Open: http://localhost:3001

---

## 7. Start the POS Desktop App

```bash
cd apps/pos
pnpm tauri dev        # compiles Rust, starts Tauri + Vite dev server
```

This will:
1. Compile the Rust Tauri backend (~2 minutes on first run)
2. Start the Vite dev server for React
3. Launch the POS window

On first launch, the POS will:
- Create the local SQLite database at `~/.local/share/pos/pos.db` (Linux/macOS)
  or `%APPDATA%\pos\pos.db` (Windows)
- Pull the product catalog from the API (requires API running)
- Show the login screen

Login with: `cashier01` / PIN `1234`

---

## 8. Run Tests

```bash
# All unit tests (all packages)
pnpm test

# API integration tests (requires Docker infra running)
cd apps/api && pnpm test:integration

# POS E2E tests (requires Tauri build)
cd apps/pos && pnpm test:e2e

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint
```

---

## 9. Offline Development

To test offline behavior:

1. Start the POS app (step 7)
2. Pull the product catalog (requires API for first sync)
3. Disconnect from the internet / stop Docker services
4. The POS will show "Offline" status badge
5. Continue scanning and completing transactions — all data goes to local SQLite
6. Restart Docker services → the POS auto-syncs pending transactions

---

## 10. Simulating a Thermal Printer

For development without a physical printer:

```bash
# Install a virtual COM port driver (Windows)
# OR use the POS's built-in "Debug Print" mode

# In apps/pos/src-tauri/.env:
PRINTER_MODE=debug        # writes receipt to ~/Desktop/receipt_debug.txt
CASH_DRAWER_ENABLED=false
```

---

## Common Issues

**Tauri build fails on Windows**:
- Install Visual Studio Build Tools 2022 (C++ workload)
- Ensure `LIBCLANG_PATH` is set if using bindgen

**SQLite busy error during sync**:
- Confirm WAL mode is enabled: `PRAGMA journal_mode=WAL;` in SQLite console
- This should be set automatically on first migration

**Product catalog not syncing**:
- Verify API is running and accessible
- Check `apps/pos` console for sync errors
- Manually trigger: Settings → Force Catalog Sync

**Login fails (cashier01 not found)**:
- Re-run seed: `cd packages/db && pnpm prisma db seed`

---

## Project Commands Reference

| Command | Location | Action |
|---|---|---|
| `pnpm install` | root | Install all dependencies |
| `pnpm dev` | root | Start all apps in parallel (API + admin) |
| `pnpm tauri dev` | apps/pos | Start POS desktop app |
| `pnpm build` | root | Build all apps |
| `pnpm test` | root | Run all unit tests |
| `pnpm lint` | root | Lint all packages |
| `pnpm typecheck` | root | Type-check all packages |
| `pnpm prisma migrate dev` | packages/db | Run/create migrations |
| `pnpm prisma studio` | packages/db | Open Prisma Studio |
| `docker compose ... up -d` | root | Start dev infrastructure |