# BE_SPEC.md — Hadilao Online (Backend Contract Summary)

> **Source of Truth:** *Hadilao Backend Software Design Specification — SPEC v7 (Final)*  
> **Mục tiêu của file này:** “Neo” Cursor/FE vào **contract thật** (route map + flow), tránh hallucination / bịa endpoint.  
> **Cập nhật:** 2026-02-15

---

## 1) Contract base & nguyên tắc versioning

- **API base:** `/api/v1` (tất cả endpoint chuẩn mới).
- **Contract Lock:** Khi `LEGACY_API_ENABLED=false` thì **mọi** request vào `/api/*` phải trả `404 Not Found`.
- Response: JSON (có thể kèm `meta.requestId` để trace logs/traces).

---

## 2) Personas & auth overview (7 persona)

- **PUBLIC/Anonymous:** không token.
- **CLIENT:** OTP → nhận `accessToken/refreshToken` (JWT-like).
- **INTERNAL:** đăng nhập `/api/v1/admin/login` → nhận token (JWT) + role/permissions.

> **Ghi chú quan trọng:** Trong SPEC v7 có chỗ mô tả OTP dưới `/auth/otp/*`, nhưng **route map** trong phụ lục đang thể hiện OTP dưới `/client/otp/*`.  
> Với FE/Cursor: **ưu tiên dùng đúng route map** dưới đây (không tự tạo endpoint mới).

---

## 3) Endpoint catalogue (route map)

### Public (core)
| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/health` | PUBLIC | Health check (liveness). |
| `GET` | `/api/v1/version` | PUBLIC | Version info (build/runtime). |

---

### Public

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/health` | PUBLIC | — |

### Menu (Client/Public)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/menu/categories` | PUBLIC/CLIENT | Menu catalog; ưu tiên cache Redis (MENU_CACHE_ENABLED). |
| `GET` | `/api/v1/menu/items` | PUBLIC/CLIENT | Menu catalog; ưu tiên cache Redis (MENU_CACHE_ENABLED). |
| `GET` | `/api/v1/menu/items/:itemId` | PUBLIC/CLIENT | Menu catalog; ưu tiên cache Redis (MENU_CACHE_ENABLED). |
| `GET` | `/api/v1/menu/items/:itemId/combo` | PUBLIC/CLIENT | Menu catalog; ưu tiên cache Redis (MENU_CACHE_ENABLED). |
| `GET` | `/api/v1/menu/items/:itemId/meat-profile` | PUBLIC/CLIENT | Menu catalog; ưu tiên cache Redis (MENU_CACHE_ENABLED). |

### Table Sessions (Client)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/sessions/:sessionKey/close` | CLIENT | — |
| `POST` | `/api/v1/sessions/open` | CLIENT | — |

### Cart (Client)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `DELETE` | `/api/v1/carts/:cartKey/items/:itemId` | CLIENT | — |
| `GET` | `/api/v1/carts/:cartKey` | CLIENT | — |
| `POST` | `/api/v1/carts/session/:sessionKey` | CLIENT | — |
| `PUT` | `/api/v1/carts/:cartKey/items` | CLIENT | — |

### Orders (Client)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/orders/:orderCode/status` | CLIENT | — |
| `POST` | `/api/v1/orders/from-cart/:cartKey` | CLIENT | — |

### Payments (Client)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/payments/vnpay/ipn` | PUBLIC | VNPay callback/return; không yêu cầu auth. |
| `GET` | `/api/v1/payments/vnpay/return` | PUBLIC | VNPay callback/return; không yêu cầu auth. |
| `POST` | `/api/v1/payments/vnpay/create/:orderCode` | CLIENT | Tạo payment URL; redirect sang VNPay sandbox/prod. |

### Realtime (Public/Internal)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/realtime/snapshot` | PUBLIC/INTERNAL | HTTP snapshot/resync phục vụ realtime recovery. |
| `POST` | `/api/v1/realtime/resync` | PUBLIC/INTERNAL | HTTP snapshot/resync phục vụ realtime recovery. |

### Admin (Other)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/observability/logs` | INTERNAL (JWT + permission) | Chỉ internal; phục vụ debug/demo. |
| `GET` | `/api/v1/admin/observability/slow-queries` | INTERNAL (JWT + permission) | Chỉ internal; phục vụ debug/demo. |
| `POST` | `/api/v1/admin/:orderCode(ORD[0-9A-F]{10})/status` | INTERNAL (JWT + permission) | Khuyến nghị Idempotency-Key cho status change. |
| `POST` | `/api/v1/admin/login` | INTERNAL (no token) | Admin login (rate-limited). |
| `POST` | `/api/v1/admin/orders/:orderCode/status` | INTERNAL (JWT + permission) | Khuyến nghị Idempotency-Key cho status change. |
| `POST` | `/api/v1/admin/payments/mock-success/:orderCode` | INTERNAL (JWT + permission) | Bắt buộc Idempotency-Key. |

### Admin Ops (Sessions/Tables)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `DELETE` | `/api/v1/admin/ops/carts/:cartKey/items/:itemId` | INTERNAL (JWT + permission) | — |
| `GET` | `/api/v1/admin/ops/carts/:cartKey` | INTERNAL (JWT + permission) | — |
| `GET` | `/api/v1/admin/ops/orders/:orderCode/status` | INTERNAL (JWT + permission) | — |
| `GET` | `/api/v1/admin/ops/tables` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/ops/carts/session/:sessionKey` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/ops/orders/from-cart/:cartKey` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/ops/sessions/:sessionKey/close` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/ops/sessions/open` | INTERNAL (JWT + permission) | — |
| `PUT` | `/api/v1/admin/ops/carts/:cartKey/items` | INTERNAL (JWT + permission) | — |

### Admin Reservations

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/reservations` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/reservations/:code/checkin` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/reservations/:code/confirm` | INTERNAL (JWT + permission) | — |

### Admin Kitchen (Orders)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/kitchen/queue` | INTERNAL (JWT + permission) | — |

### Admin Cashier (Payments)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/cashier/unpaid` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/cashier/settle-cash/:orderCode` | INTERNAL (JWT + permission) | Bắt buộc Idempotency-Key. |

### Admin Inventory

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/inventory/holds` | INTERNAL (JWT + permission) | — |
| `GET` | `/api/v1/admin/inventory/rehydrate/metrics` | INTERNAL (JWT + permission) | — |
| `GET` | `/api/v1/admin/inventory/stock` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/inventory/menu/bump` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/inventory/rehydrate/run` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/inventory/stock/adjust` | INTERNAL (JWT + permission) | — |

### Admin Staff (Users/Roles)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/staff` | INTERNAL (JWT + permission) | — |
| `PATCH` | `/api/v1/admin/staff/:staffId/role` | INTERNAL (JWT + permission) | — |
| `PATCH` | `/api/v1/admin/staff/:staffId/status` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/staff` | INTERNAL (JWT + permission) | — |
| `POST` | `/api/v1/admin/staff/:staffId/reset-password` | INTERNAL (JWT + permission) | — |

### Admin Realtime

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/realtime/audit` | INTERNAL (JWT + permission) | Audit/replay phục vụ trace realtime. |
| `GET` | `/api/v1/admin/realtime/replay` | INTERNAL (JWT + permission) | Audit/replay phục vụ trace realtime. |

### Admin Maintenance

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/admin/maintenance/run` | INTERNAL (JWT + permission) | Ops job; chỉ ADMIN hoặc role có maintenance.run. |
| `POST` | `/api/v1/admin/maintenance/sync-table-status` | INTERNAL (JWT + permission) | Ops job; chỉ ADMIN hoặc role có maintenance.run. |

### Legacy (/api/*)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/reservations/:reservationCode` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |
| `GET` | `/api/v1/reservations/availability` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |
| `GET` | `/api/v1/tables` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |
| `GET` | `/api/v1/tables/:directionId` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |
| `POST` | `/api/v1/client/logout` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |
| `POST` | `/api/v1/client/otp/request` | PUBLIC | OTP request/verify (rate-limited). DEV_OTP_ECHO có thể bật trong local. |
| `POST` | `/api/v1/client/otp/verify` | PUBLIC | OTP request/verify (rate-limited). DEV_OTP_ECHO có thể bật trong local. |
| `POST` | `/api/v1/client/refresh` | CLIENT (refresh token) | Refresh token rotation; trả accessToken mới. |
| `POST` | `/api/v1/reservations` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |
| `POST` | `/api/v1/reservations/:reservationCode/cancel` | PUBLIC/CLIENT (DEPRECATED) | Legacy alias; chỉ dùng nếu backend còn bật. |


---

## 4) Core flows (tóm tắt)

### 4.1 Client flow (QR/Table)
1. OTP request/verify → có token CLIENT  
2. Open table session (`/sessions/open`) → nhận `sessionKey`
3. Fetch menu (`/menu/*`)
4. Create/attach cart (`/carts/session/:sessionKey`) → upsert items (Redis stock holds)
5. Place order (`/orders/from-cart/:cartKey`)
6. Payment (`/payments/vnpay/create/:orderCode`) → VNPay return/IPN
7. Realtime: join room theo `sessionKey/branch` → nhận events cập nhật trạng thái

### 4.2 Internal flow (Ops/Kitchen/Cashier)
- **Ops:** tables/session/cart/order theo branch (`/admin/ops/*`)
- **Kitchen:** queue read + status change (`/admin/kitchen/queue`, `/admin/orders/:orderCode/status`)
- **Cashier:** unpaid list + settle cash (idempotent) (`/admin/cashier/*`)

### 4.3 Inventory flow
- Read stock (`/admin/inventory/stock`)
- Adjust stock (`/admin/inventory/stock/adjust`) + audit
- Holds visibility (`/admin/inventory/holds`)
- (Optional) Rehydrate metrics/run (`/admin/inventory/rehydrate/*`)

---

## 5) Realtime (server-side hints cho FE)

- Socket.IO path: mặc định `/socket.io` (config: `SOCKET_PATH`)
- Event version: `REALTIME_EVENT_VERSION=1`
- Replay/resync: dùng HTTP snapshot/resync + admin replay/audit để recovery khi reconnect/seq gap.
