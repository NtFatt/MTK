# Hadilao Online

Monorepo `pnpm workspace` cho he thong ordering + operations nha hang, gom customer flow, internal roles, inventory/hold, payment, reservation va realtime.

## Stack
- `apps/api`: Express + TypeScript + MySQL + Redis + Socket.IO
- `apps/fe`: React + Vite + TanStack Query + Zustand + Socket.IO client
- `packages/contracts`: shared query keys / contract helpers

## Quickstart
Yeu cau:
- Node.js 22.x
- pnpm 10.x
- MySQL 8
- Redis

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
pnpm -C apps/api dev
pnpm -C apps/fe dev
```

API mac dinh: `http://localhost:3001`  
FE mac dinh: `http://localhost:5173`

## Verification
```powershell
pnpm verify:static
pnpm verify:smokes
pnpm verify:all
```

Smoke packs chinh:
- `smoke:full`: customer + internal 7 roles + inventory + ops
- `smoke:negative`: 401/403/404/409/429 + duplicate idempotency checks
- `smoke:realtime`: replay / gap / room sanity
- `smoke:oversell`: deterministic 1 success + 1 `OUT_OF_STOCK`

## Current Source Of Truth
- Customer `+ / -` trong cart chi tao/release hold tam thoi o Redis.
- `CreateOrderFromCart` la diem commit kho: tao order, consume hold, tru ingredient inventory, ghi `inventory_consumptions`, sync sellable stock.
- `PREPARING` khong con la diem tru kho chinh; no chi con legacy-safe no-op neu order moi da consume tu truoc.
- Huy order o `NEW/RECEIVED` se restock ingredient inventory; huy sau do khong auto restock.

## Key Docs
- [Runbook API](./apps/api/docs/RUNBOOK.md)
- [Smoke Guide](./apps/api/postman/README_SMOKE.md)
- [Project Snapshot Spec](./docs/final/PROJECT_SNAPSHOT_SPEC.md)
- [Final Handover](./docs/final/FINAL_HANDOVER.md)
- [Source Of Truth](./docs/final/SOURCE_OF_TRUTH.md)
- [Known Issues](./docs/final/KNOWN_ISSUES.md)
- [Generated Route Map](./docs/API_ROUTE_MAP.generated.md)

## Notes
- Khong commit `.env`, secret that, hoac `node_modules`.
- `db:reset` local se restock demo stock de smoke deterministic hon.
- Contract chuan la `/api/v1/*`; legacy `/api/*` chi ton tai khi bat co migration tuong ung.
