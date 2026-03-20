# Hadilao Smoke Packs

Muc tieu: verify local runtime theo dung contract hien tai, khong chi happy path ma ca negative/idempotency/realtime/oversell.

## Root-safe commands
Tu root repo:

```powershell
pnpm -C apps/api smoke
pnpm -C apps/api smoke:full
pnpm -C apps/api smoke:negative
pnpm -C apps/api smoke:realtime
pnpm -C apps/api smoke:oversell
pnpm -C apps/api verify:smokes
```

## Packs
- `smoke`: core flow toi thieu
- `smoke:full`: customer + internal 7 roles + ops + inventory + realtime snapshot
- `smoke:negative`: validation, rate limit, branch isolation, forbidden actions, idempotency, contract lock
- `smoke:realtime`: replay/join/gap sanity
- `smoke:oversell`: deterministic concurrency guard

## Deterministic behavior
- Moi smoke run co `reset-dev-state` truoc khi chay de don session/table/reservation cu.
- `smoke:negative` tu seed mot `orderOther` fixture vao env tam truoc khi chay, de branch-mismatch test khong phu thuoc vao checkout cross-branch.
- `smoke:oversell` ep stock = 1 roi dua 2 cart song song; ky vong dung la 1 success + 1 `409 OUT_OF_STOCK`.

## Postman environment
File chinh: `postman/Hadilao_Smoke_Local.postman_environment.json`

Keys quan trong:
- `baseUrl`
- `socketPath`
- `smokeRealtime=true`
- `smokeReset=true`
- `smokeResetFlushRedis=true`
- `smokeRestock=true`
- `smokeRestockQty=100`
- `branchOtherId=999`

## Notes
- `reset-dev-state` va `dev/set-stock` la dev-only, khong phai production contract.
- Legacy `/api/*` duoc kiem nhu negative case; khi `LEGACY_API_ENABLED=false` thi `/api/*` phai tra `404`.
- Neu Redis tat, mot so buoc realtime se skip/fallback, nhung bo verify day du nen chay voi Redis bat.
