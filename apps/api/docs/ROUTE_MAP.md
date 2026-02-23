# ROUTE_MAP (Spec v6.2)

> **Source of truth** for permissions: `src/domain/rbac/permissions.ts`.

This file is generated from the current Express routers and `routes/index.ts` mounts.

## Client Auth (OTP / Login)

| Method | Path | Permission (if internal) |
|---|---|---|
| POST | /api/v1/client/logout |  |
| POST | /api/v1/client/otp/request |  |
| POST | /api/v1/client/otp/verify |  |
| POST | /api/v1/client/refresh |  |

## Client/Public API (Menu / Tables / Sessions / Cart / Order / Payment / Reservation / Realtime)

| Method | Path | Permission (if internal) |
|---|---|---|
| GET | /api/v1/carts/:cartKey |  |
| PUT | /api/v1/carts/:cartKey/items |  |
| DELETE | /api/v1/carts/:cartKey/items/:itemId |  |
| POST | /api/v1/carts/session/:sessionKey |  |
| GET | /api/v1/menu/categories |  |
| GET | /api/v1/menu/items |  |
| GET | /api/v1/menu/items/:itemId |  |
| GET | /api/v1/menu/items/:itemId/combo |  |
| GET | /api/v1/menu/items/:itemId/meat-profile |  |
| GET | /api/v1/orders/:orderCode/status |  |
| POST | /api/v1/orders/from-cart/:cartKey |  |
| POST | /api/v1/payments/vnpay/create/:orderCode |  |
| GET | /api/v1/payments/vnpay/ipn |  |
| GET | /api/v1/payments/vnpay/return |  |
| POST | /api/v1/realtime/resync |  |
| GET | /api/v1/realtime/snapshot |  |
| POST | /api/v1/reservations/ |  |
| GET | /api/v1/reservations/:reservationCode |  |
| POST | /api/v1/reservations/:reservationCode/cancel |  |
| GET | /api/v1/reservations/availability |  |
| POST | /api/v1/sessions/:sessionKey/close |  |
| POST | /api/v1/sessions/open |  |
| GET | /api/v1/tables/ |  |
| GET | /api/v1/tables/:directionId |  |

## Admin (Internal) API (RBAC)

| Method | Path | Permission (if internal) |
|---|---|---|
| POST | /api/v1/admin/:orderCode(ORD[0-9A-F]{10})/status | orders.status.change |
| POST | /api/v1/admin/cashier/settle-cash/:orderCode | cashier.settle_cash |
| GET | /api/v1/admin/cashier/unpaid | cashier.unpaid.read |
| GET | /api/v1/admin/inventory/holds | inventory.holds.read |
| POST | /api/v1/admin/inventory/menu/bump | menu.manage |
| GET | /api/v1/admin/inventory/rehydrate/metrics | inventory.read |
| POST | /api/v1/admin/inventory/rehydrate/run | inventory.adjust |
| GET | /api/v1/admin/inventory/stock | inventory.read |
| POST | /api/v1/admin/inventory/stock/adjust | inventory.adjust |
| GET | /api/v1/admin/kitchen/queue | kitchen.queue.read |
| POST | /api/v1/admin/login |  |
| POST | /api/v1/admin/maintenance/dev/set-stock | maintenance.run |
| POST | /api/v1/admin/maintenance/reset-dev-state | maintenance.run |
| POST | /api/v1/admin/maintenance/run | maintenance.run |
| POST | /api/v1/admin/maintenance/sync-table-status | maintenance.run |
| GET | /api/v1/admin/observability/logs | observability.admin.read |
| GET | /api/v1/admin/observability/slow-queries | observability.admin.read |
| GET | /api/v1/admin/ops/carts/:cartKey | ops.carts.get |
| PUT | /api/v1/admin/ops/carts/:cartKey/items | ops.carts.items.upsert |
| DELETE | /api/v1/admin/ops/carts/:cartKey/items/:itemId | ops.carts.items.upsert |
| POST | /api/v1/admin/ops/carts/session/:sessionKey | ops.carts.get |
| GET | /api/v1/admin/ops/orders/:orderCode/status | ops.tables.read |
| POST | /api/v1/admin/ops/orders/from-cart/:cartKey | ops.orders.create |
| POST | /api/v1/admin/ops/sessions/:sessionKey/close | ops.sessions.close |
| POST | /api/v1/admin/ops/sessions/open | ops.sessions.open |
| GET | /api/v1/admin/ops/tables | ops.tables.read |
| POST | /api/v1/admin/orders/:orderCode/status | orders.status.change |
| POST | /api/v1/admin/payments/mock-success/:orderCode | payments.mock_success |
| GET | /api/v1/admin/realtime/audit |  |
| GET | /api/v1/admin/realtime/replay |  |
| GET | /api/v1/admin/reservations | reservations.confirm |
| POST | /api/v1/admin/reservations/:reservationCode/checkin | reservations.checkin |
| PATCH | /api/v1/admin/reservations/:reservationCode/confirm | reservations.confirm |
| POST | /api/v1/admin/reservations/:reservationCode/confirm | reservations.confirm |
| GET | /api/v1/admin/staff | staff.read |
| POST | /api/v1/admin/staff | staff.manage |
| POST | /api/v1/admin/staff/:staffId/reset-password | staff.manage |
| PATCH | /api/v1/admin/staff/:staffId/role | staff.manage |
| PATCH | /api/v1/admin/staff/:staffId/status | staff.manage |

## Notes

- **Admin API** requires internal JWT (`/api/v1/admin/login`) + `requirePermission(...)`.
- **Legacy API** routes (if any) must be feature-flagged and **return 404** when disabled.
