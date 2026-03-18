# Hadilao Online API — RUNBOOK (Local / PR21 Final)

Tài liệu này là runbook local chuẩn để người khác có thể:

- cài môi trường
- reset lại dữ liệu local
- chạy API + FE
- seed account demo
- chạy smoke pack
- xử lý local state bị bẩn
- chuẩn bị demo an toàn

---

## 1) Prerequisites

Bắt buộc:

- Node.js 22.x
- pnpm 10.x
- MySQL 8 đang chạy local
- Redis đang chạy local

Mặc định local được viết theo:

- MySQL: `127.0.0.1:3306`
- Redis: `127.0.0.1:6379`
- API: `http://localhost:3001`
- FE: `http://localhost:5173`

---

## 2) Cài dependency

Từ root repo:

```powershell
pnpm install
```

---

## 3) Tạo env local

Tạo file env từ mẫu:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Các nhóm biến quan trọng trong `apps/api/.env`:

### 3.1 Contract lock
- `LEGACY_API_ENABLED=false`

Giữ route contract đúng ở `/api/v1/*`. Nếu bật legacy lung tung thì dễ làm FE/demo sai chuẩn.

### 3.2 Database
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

### 3.3 Redis / realtime
- `REDIS_URL`
- `REALTIME_ENABLED=true`
- `SOCKET_PATH=/socket.io`
- `REALTIME_REPLAY_ENABLED=true`
- `REALTIME_ADMIN_AUDIT_ENABLED=true`

### 3.4 Metrics / observability
- `METRICS_ENABLED=true`
- `METRICS_PATH=/api/v1/metrics`
- `METRICS_REQUIRE_ADMIN=true`

### 3.5 Idempotency
- `IDEMPOTENCY_TTL_SECONDS=600`

Áp dụng cho các operation nhạy cảm như cashier settle cash và payment-related retry flow.

### 3.6 OTP dev mode
- `DEV_OTP_ECHO_ENABLED=true`
- `DEV_OTP_FIXED_CODE=123456`

Chỉ dành cho local/dev. Không phải production behavior.

### 3.7 Dev reset tools
- `DEV_RESET_ENABLED=true`

Cho phép reset deterministic state phục vụ smoke/demo local.

---

## 4) Safe reset rules

### 4.1 Cảnh báo
Lệnh dưới đây **phá dữ liệu local hiện tại**:

```powershell
pnpm -C apps/api db:reset --yes
```

Lệnh này sẽ:

- drop / recreate database local
- áp canonical schema + migrations
- seed dữ liệu demo

### 4.2 Khi nào nên dùng
Dùng khi:

- lần đầu setup
- local state bị bẩn
- smoke/demo bị kẹt reservation/session/table status
- muốn quay về baseline sạch trước khi handover/demo

### 4.3 Không dùng nhầm
Không chạy vào DB không phải local/dev. Không dùng trên data thật.

---

## 5) Seed tài khoản nội bộ

Sau khi reset DB, chạy:

```powershell
pnpm -C apps/api seed:internal
```

Tài khoản mặc định:

- `admin / admin123` → ADMIN
- `bm01 / 123456` → BRANCH_MANAGER, branch 1
- `staff01 / 123456` → STAFF, branch 1
- `kitchen01 / 123456` → KITCHEN, branch 1
- `cashier01 / 123456` → CASHIER, branch 1

Nếu cần tạo lại thủ công:

```powershell
pnpm -C apps/api admin:create admin admin123 "System Admin"
pnpm -C apps/api staff:create bm01 123456 BRANCH_MANAGER 1 "Branch Manager 01"
pnpm -C apps/api staff:create staff01 123456 STAFF 1 "Staff 01"
pnpm -C apps/api staff:create kitchen01 123456 KITCHEN 1 "Kitchen 01"
pnpm -C apps/api staff:create cashier01 123456 CASHIER 1 "Cashier 01"
```

---

## 6) Startup sequence chuẩn

### Terminal 1 — API
```powershell
pnpm -C apps/api dev
```

### Terminal 2 — FE
```powershell
pnpm -C apps/fe dev
```

### Terminal 3 — verification / smoke
Dùng sau khi API đã healthy.

---

## 7) What good looks like

Sau khi startup đúng, tối thiểu phải kiểm được:

### API
- `GET http://localhost:3001/api/v1/health` trả OK
- `GET /api/v1/metrics` hoạt động nếu bật metrics và có quyền phù hợp

### FE public/customer
- mở được `http://localhost:5173/c/qr`
- nhập `branchId=1`, `tableCode=A01` mở session được
- vào được `/c/menu`, `/c/cart`, `/c/checkout`

### FE internal
- login được tại `http://localhost:5173/i/login`
- `admin` vào được `/i/1/admin/dashboard`
- `staff01` vào được `/i/1/tables`
- `kitchen01` vào được `/i/1/kitchen`
- `cashier01` vào được `/i/1/cashier`
- `bm01` vào được `/i/1/inventory/stock` hoặc `/i/1/reservations`

---

## 8) Verification gates

### 8.1 Contracts / FE / API build gates
```powershell
pnpm -C packages/contracts build

pnpm -C apps/fe lint
pnpm -C apps/fe typecheck
pnpm -C apps/fe build

pnpm -C apps/api typecheck
pnpm -C apps/api build
```

### 8.2 Smoke packs
Chạy khi API đang bật:

```powershell
pnpm -C apps/api smoke:full
pnpm -C apps/api smoke:negative
pnpm -C apps/api smoke:realtime
pnpm -C apps/api smoke:oversell
```

Kỳ vọng:

- `smoke:full` pass
- `smoke:negative` pass
- `smoke:realtime` pass
- `smoke:oversell` pass, đúng pattern: 1 success + 1 fail `OUT_OF_STOCK`

---

## 9) Chuẩn bị demo an toàn

### Chế độ strict
Dùng khi cần dry-run đầy đủ trước khi demo/chốt PR:

```powershell
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
pnpm -C packages/contracts build
pnpm -C apps/api dev
pnpm -C apps/fe dev
pnpm -C apps/api smoke:full
pnpm -C apps/api smoke:negative
pnpm -C apps/api smoke:realtime
pnpm -C apps/api smoke:oversell
```

### Chế độ presentation
Dùng ngay trước lúc demo người chấm:

```powershell
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
pnpm -C packages/contracts build
pnpm -C apps/api dev
pnpm -C apps/fe dev
```

Sau đó spot-check nhanh:

- `/c/qr`
- `/i/login`
- admin dashboard
- kitchen
- cashier

---

## 10) Khi local state bị bẩn

### 10.1 `NO_TABLE_AVAILABLE`
Nguyên nhân:

- reservation/session cũ chưa dọn
- lần smoke trước để lại trạng thái bàn

Cách xử lý mạnh nhất:

```powershell
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
```

### 10.2 Realtime không vào room / không thấy update
Kiểm tra:

- Redis có chạy không
- `REALTIME_ENABLED=true`
- `SOCKET_PATH=/socket.io`
- FE đang gọi đúng `/socket.io`
- không đổi `VITE_API_BASE` sai contract

### 10.3 FE gọi sai route / 404 lạ
Kiểm tra:

- FE phải dùng `/api/v1/*`
- `LEGACY_API_ENABLED=false` thì `/api/*` bị 404 là bình thường
- Vite proxy còn đúng không

### 10.4 Login nội bộ vào được nhưng redirect sai branch
Kiểm tra:

- account branch-scoped có `branch_id=1`
- admin thì route chuẩn là `/i/1/admin/*`
- non-admin thì route chuẩn là `/i/1/*`

### 10.5 Metrics 401 / 403 / 404
- 404: có thể `METRICS_ENABLED=false`
- 401/403: có thể `METRICS_REQUIRE_ADMIN=true` nhưng request không có quyền phù hợp

---

## 11) Demo data baseline đang dùng

Sau `db:reset --yes`, baseline local quan trọng:

- branch demo chính: `branch_id=1`
- branch phụ cho negative/branch isolation: `branch_id=999`
- table demo an toàn: `A01`, `A02`, `B01`
- table cross-branch test: `Z01`, `Z02`

Khuyến nghị demo customer main flow bằng:

- branch 1
- table `A01`

---

## 12) Current final docs

Đọc cùng các file sau:

- `docs/final/ACCOUNT_MATRIX.md`
- `docs/final/DEMO_SCRIPT.md`
- `docs/final/FINAL_HANDOVER.md`
- `docs/final/KNOWN_ISSUES.md`
- `docs/final/FINAL_STATUS.md`
