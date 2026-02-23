# Hadilao Smoke (v7)

Mục tiêu: chạy **core flow** ổn định trên local (có/không Redis), hạn chế lỗi 409 kiểu `NO_TABLE_AVAILABLE` do trạng thái kẹt sau các lần chạy trước.

## Runbook (local)
1) Reset DB (canonical + seed)
```bash
pnpm db:reset --yes
```

2) Start API
```bash
pnpm dev
```

3) Run smoke
```bash
pnpm smoke
```

## Full smoke (7 roles + inventory + ops)
Chạy thêm **core flow + internal ops + 7 roles (STAFF/KITCHEN/CASHIER/BRANCH_MANAGER) + inventory/menu cache + realtime snapshot**.

```bash
pnpm smoke:full
```

Collection:
- `postman/Hadilao_Smoke_FullFlow_7Roles_v1.postman_collection.json`

## Biến môi trường Postman (Hadilao Smoke - Local)
Các keys nằm trong file `postman/Hadilao_Smoke_Local.postman_environment.json`:

- `baseUrl` (vd: http://localhost:3001)
- `socketPath` (mặc định `/socket.io`)
- `smokeRealtime=true` -> chạy Socket.IO sanity check sau khi Postman xong.

### NEW: Dev reset trước smoke (khuyến nghị)
Smoke runner sẽ gọi endpoint reset dev state nếu bật:

- `smokeReset=true`
- `smokeResetFlushRedis=true` (tùy chọn) -> flush Redis DB (dev only)
- `smokeBranchId` (tùy chọn) -> reset theo 1 branch

Endpoint được gọi:
`POST /api/v1/admin/maintenance/reset-dev-state?branchId=<...>&flushRedis=true`

Body:
```json
{ "confirm": "RESET", "flushRedis": true }
```

## Ghi chú
- Reset dev state là **dev-only** (guarded bởi `DEV_RESET_ENABLED`, mặc định bật khi `NODE_ENV != production`).
- Nếu Redis chưa chạy, smoke vẫn chạy được (realtime/redis steps tự skip hoặc fallback).
