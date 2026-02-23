# CHANGELOG — P0 Stabilization (v11)

Date: 2026-02-08

## What’s new
### 1) Dev reset endpoint (fix 409 `NO_TABLE_AVAILABLE` quickly)
- Added **admin** endpoint:
  - `POST /api/v1/admin/maintenance/reset-dev-state`
  - Body: `{ "confirm": "RESET", "flushRedis": true }`
  - Query: `?branchId=1&flushRedis=true`
- Guard:
  - Requires **Admin auth** (`Authorization: Bearer <token>`)
  - Requires `DEV_RESET_ENABLED=true`
  - Requires confirm == `RESET`

### 2) Smoke runner pre-clean (deterministic local smoke)
- `pnpm smoke` now calls `scripts/smoke/reset-dev-state.mjs` BEFORE newman.
- Toggle via Postman env:
  - `smokeReset=true`
  - `smokeResetFlushRedis=true`
  - `smokeBranchId=1`

### 3) Performance patch: remove hot-path row lock
- `MySQLTableSessionRepository.closeBySessionKey` changed to idempotent `UPDATE ... WHERE status='OPEN'` (no `SELECT ... FOR UPDATE`).

### 4) Docs & env
- Updated `.env.example` with Redis session store / stock holds toggles & dev reset.
- Updated `postman/README_SMOKE.md` (v7)

## Files changed
- `src/infrastructure/db/mysql/repositories/MySQLTableSessionRepository.ts`
- `src/application/ports/repositories/IMaintenanceRepository.ts`
- `src/infrastructure/db/mysql/repositories/MySQLMaintenanceRepository.ts`
- `src/application/use-cases/maintenance/ResetDevState.ts`
- `src/interface-adapters/http/controllers/AdminMaintenanceController.ts`
- `src/interface-adapters/http/routes/admin-maintenance.route.ts`
- `src/interface-adapters/http/middlewares/errorHandler.ts`
- `src/infrastructure/config/env.ts`
- `src/main/di.ts`
- `scripts/smoke/reset-dev-state.mjs`
- `scripts/smoke/run-smoke.mjs`
- `postman/Hadilao_Smoke_Local.postman_environment.json`
- `postman/README_SMOKE.md`
- `.env.example`

## Notes
- Endpoint `reset-dev-state` is intended for local/dev only.
- If you run in prod/staging, keep `DEV_RESET_ENABLED=false`.