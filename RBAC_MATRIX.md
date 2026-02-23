# RBAC_MATRIX.md — 7 Roles → Permissions → Pages/Actions (FE)

> **Source of Truth:** SPEC v7 — RBAC (7 persona) + permission naming `domain.resource.action`.  
> Mục tiêu: FE route-guard + action-guard theo **permission**, không chỉ theo role.

---

## 1) Personas (7)

| Persona | Mô tả | Auth |
|---|---|---|
| PUBLIC | Anonymous/public | Không token |
| CLIENT | Khách theo bàn | OTP → access/refresh |
| ADMIN | Super admin (cross-branch) | Admin login |
| BRANCH_MANAGER | Quản lý chi nhánh (scope branch) | Admin login |
| STAFF | Phục vụ/ops | Admin login |
| KITCHEN | Bếp | Admin login |
| CASHIER | Thu ngân | Admin login |

---

## 2) Permission sets theo role (tóm tắt)

> Lấy trực tiếp từ SPEC v7 (CSV).

| Role | Permissions (high level) |
|---|---|
| ADMIN | Full: ops + kitchen + cashier + inventory + staff.manage + maintenance + observability + realtime.admin |
| BRANCH_MANAGER | ops + kitchen + cashier + inventory + staff.read + menu.manage |
| STAFF | ops (tables/sessions/carts/orders) + reservations (confirm/checkin) |
| KITCHEN | kitchen.queue.read + orders.status.change |
| CASHIER | cashier.unpaid.read + cashier.settle_cash |

---

## 3) FE Pages/Actions → Permission mapping (khuyến nghị chuẩn hoá)

> FE **PHẢI** làm 2 lớp:
> 1) `RouteGuard` (trang nào được vào)  
> 2) `ActionGuard` (nút/submit nào được bấm)

### 3.1 Public / Client area

| Page/Route | Persona | API chính | Permission |
|---|---|---|---|
| `/client/login` (OTP) | PUBLIC → CLIENT | `POST /client/otp/*`, `/client/refresh` | — |
| `/client/session/open` | CLIENT | `POST /sessions/open` | — |
| `/client/menu` | PUBLIC/CLIENT | `GET /menu/*` | — |
| `/client/cart` | CLIENT | `GET/PUT/DELETE /carts/*` | — |
| `/client/order/:orderCode` | CLIENT | `GET /orders/:orderCode/status` | — |
| `/client/payment/:orderCode` | CLIENT | `POST /payments/vnpay/create/:orderCode` | — |
| `/payment/return` | PUBLIC | `GET /payments/vnpay/return` | — |

### 3.2 Internal area (layouts/internal/*)

| Page/Route | Roles | API chính | Permission required |
|---|---|---|---|
| `/internal/ops/tables` | ADMIN, BRANCH_MANAGER, STAFF | `GET /admin/ops/tables` | `ops.tables.read` |
| `/internal/ops/sessions` | ADMIN, BRANCH_MANAGER, STAFF | `POST /admin/ops/sessions/open`, `POST /admin/ops/sessions/:sessionKey/close` | `ops.sessions.open`, `ops.sessions.close` |
| `/internal/ops/cart/:cartKey` | ADMIN, BRANCH_MANAGER, STAFF | `GET/PUT/DELETE /admin/ops/carts/*` | `ops.carts.get`, `ops.carts.items.upsert` |
| `/internal/ops/order/create` | ADMIN, BRANCH_MANAGER, STAFF | `POST /admin/ops/orders/from-cart/:cartKey` | `ops.orders.create` |
| `/internal/reservations` | ADMIN, BRANCH_MANAGER, STAFF | `GET/POST /admin/reservations/*` | `reservations.confirm`, `reservations.checkin` |
| `/internal/kitchen/queue` | ADMIN, BRANCH_MANAGER, KITCHEN | `GET /admin/kitchen/queue` | `kitchen.queue.read` |
| `/internal/orders/:orderCode/status` | ADMIN, BRANCH_MANAGER, KITCHEN | `POST /admin/orders/:orderCode/status` | `orders.status.change` |
| `/internal/cashier/unpaid` | ADMIN, BRANCH_MANAGER, CASHIER | `GET /admin/cashier/unpaid` | `cashier.unpaid.read` |
| `/internal/cashier/settle/:orderCode` | ADMIN, BRANCH_MANAGER, CASHIER | `POST /admin/cashier/settle-cash/:orderCode` | `cashier.settle_cash` (+ Idempotency-Key) |
| `/internal/payments/mock-success/:orderCode` | ADMIN | `POST /admin/payments/mock-success/:orderCode` | `payments.mock_success` (+ Idempotency-Key) |
| `/internal/inventory/stock` | ADMIN, BRANCH_MANAGER | `GET /admin/inventory/stock` | `inventory.read` |
| `/internal/inventory/adjust` | ADMIN, BRANCH_MANAGER | `POST /admin/inventory/stock/adjust` | `inventory.adjust` |
| `/internal/inventory/holds` | ADMIN, BRANCH_MANAGER | `GET /admin/inventory/holds` | `inventory.holds.read` |
| `/internal/menu/manage` | ADMIN, BRANCH_MANAGER | `POST /admin/inventory/menu/bump` | `menu.manage` |
| `/internal/staff` | ADMIN, BRANCH_MANAGER | `GET /admin/staff` | `staff.read` |
| `/internal/staff/manage` | ADMIN | `POST/PATCH /admin/staff/*` | `staff.manage` |
| `/internal/maintenance` | ADMIN | `POST /admin/maintenance/*` | `maintenance.run` |
| `/internal/observability/logs` | ADMIN | `GET /admin/observability/logs` | `observability.admin.read` |
| `/internal/observability/slow-queries` | ADMIN | `GET /admin/observability/slow-queries` | `observability.admin.read` |
| `/internal/realtime/audit` | ADMIN | `GET /admin/realtime/audit` | `realtime.admin` |
| `/internal/realtime/replay` | ADMIN | `GET /admin/realtime/replay` | `realtime.admin` |

---

## 4) FE implementation rule (để Cursor không lệch)

- Không check role trực tiếp trong component.  
  → `can(permission)` / `hasAll([...])` từ `authStore.capabilities`.
- Route config có field: `requiredPermissions`, `allowedRoles` (role chỉ là coarse filter).
- Disable/hide action theo permission **và** backend vẫn enforce 403.
