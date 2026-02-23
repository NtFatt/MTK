# Hadilao Online API – RUNBOOK (Local)

> One page “how to run” for the next dev. Keep this file updated.

## 0) Prerequisites

- **Node.js**: v22.x (the repo has been tested on Node **22.20.0**)
- **pnpm** installed and available in PATH
- **MySQL 8** running locally (default: `127.0.0.1:3306`)
- **Redis** running locally (default: `127.0.0.1:6379`)

## 1) Setup

```bash
cd apps/api
pnpm i
```

Create local env file:

```bash
copy .env.example .env
```

Make sure `.env` values match your local MySQL/Redis.

## 2) Database

### Reset DB (DESTRUCTIVE)

This will **DROP** and recreate the database, apply canonical schema + migrations + seed.

```bash
pnpm db:reset --yes
```

## 3) Run API

```bash
pnpm dev
```

Health check:

```bash
curl http://localhost:3001/api/v1/health
```

## 4) Smoke tests

> All smoke scripts assume the API is reachable at the `baseUrl` inside the Postman environment JSON.

### Full end-to-end (client OTP → reservation → cart → order → payment → roles → inventory → realtime)

```bash
pnpm smoke:full
```

### Negative pack (rate-limit, forbidden, idempotency, branch mismatch, etc.)

```bash
pnpm smoke:negative
```

### Realtime sanity (Socket.IO + replay)

```bash
pnpm smoke:realtime
```

Notes:
- `realtime-sanity.mjs` now **auto-recovers** from `409 NO_TABLE_AVAILABLE` by calling `reset-dev-state` and retrying once.
- `run-negative.mjs` now runs a **cleanup reset** at the end to prevent leftover sessions/reservations from breaking later smokes.

### Deterministic oversell test (atomic holds)

```bash
pnpm smoke:oversell
```

Expected: exactly **1** request succeeds and **1** fails with `409 OUT_OF_STOCK`.

## 5) Common fixes

### NO_TABLE_AVAILABLE (409)

Cause: previous smokes left tables reserved / sessions open.

Fix:
```bash
pnpm smoke:realtime
# or
pnpm smoke:full
# or hard reset
pnpm db:reset --yes
```

### “database is locked” / state drift

If you see drift between canonical schema and DB, always run:

```bash
pnpm db:reset --yes
```

## 6) What to run before demo

```bash
pnpm db:reset --yes
pnpm dev
pnpm smoke:full
pnpm smoke:negative
pnpm smoke:realtime
pnpm smoke:oversell
```
