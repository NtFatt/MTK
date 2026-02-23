# Hadilao API Route Map

Generated at: 2026-02-14T07:40:57Z

## Canonical routes (LEGACY_API_ENABLED=false)

| Method | Path |
|---|---|
| POST | /api/v1/admin/:orderCode(ORD[0-9A-F]{10})/status |
| POST | /api/v1/admin/cashier/settle-cash/:orderCode |
| GET | /api/v1/admin/cashier/unpaid |
| GET | /api/v1/admin/inventory/holds |
| POST | /api/v1/admin/inventory/menu/bump |
| GET | /api/v1/admin/inventory/rehydrate/metrics |
| POST | /api/v1/admin/inventory/rehydrate/run |
| GET | /api/v1/admin/inventory/stock |
| POST | /api/v1/admin/inventory/stock/adjust |
| GET | /api/v1/admin/kitchen/queue |
| POST | /api/v1/admin/login |
| POST | /api/v1/admin/maintenance/run |
| POST | /api/v1/admin/maintenance/sync-table-status |
| GET | /api/v1/admin/observability/logs |
| GET | /api/v1/admin/observability/slow-queries |
| GET | /api/v1/admin/ops/carts/:cartKey |
| PUT | /api/v1/admin/ops/carts/:cartKey/items |
| DELETE | /api/v1/admin/ops/carts/:cartKey/items/:itemId |
| POST | /api/v1/admin/ops/carts/session/:sessionKey |
| GET | /api/v1/admin/ops/orders/:orderCode/status |
| POST | /api/v1/admin/ops/orders/from-cart/:cartKey |
| POST | /api/v1/admin/ops/sessions/:sessionKey/close |
| POST | /api/v1/admin/ops/sessions/open |
| GET | /api/v1/admin/ops/tables |
| POST | /api/v1/admin/orders/:orderCode/status |
| POST | /api/v1/admin/payments/mock-success/:orderCode |
| GET | /api/v1/admin/realtime/audit |
| GET | /api/v1/admin/realtime/replay |
| GET | /api/v1/admin/reservations |
| POST | /api/v1/admin/reservations/:code/checkin |
| POST | /api/v1/admin/reservations/:code/confirm |
| GET | /api/v1/admin/staff |
| POST | /api/v1/admin/staff |
| POST | /api/v1/admin/staff/:staffId/reset-password |
| PATCH | /api/v1/admin/staff/:staffId/role |
| PATCH | /api/v1/admin/staff/:staffId/status |
| GET | /api/v1/carts/:cartKey |
| PUT | /api/v1/carts/:cartKey/items |
| DELETE | /api/v1/carts/:cartKey/items/:itemId |
| POST | /api/v1/carts/session/:sessionKey |
| POST | /api/v1/client/logout |
| POST | /api/v1/client/otp/request |
| POST | /api/v1/client/otp/verify |
| POST | /api/v1/client/refresh |
| GET | /api/v1/health |
| GET | /api/v1/menu/categories |
| GET | /api/v1/menu/items |
| GET | /api/v1/menu/items/:itemId |
| GET | /api/v1/menu/items/:itemId/combo |
| GET | /api/v1/menu/items/:itemId/meat-profile |
| GET | /api/v1/orders/:orderCode/status |
| POST | /api/v1/orders/from-cart/:cartKey |
| POST | /api/v1/payments/vnpay/create/:orderCode |
| GET | /api/v1/payments/vnpay/ipn |
| GET | /api/v1/payments/vnpay/return |
| POST | /api/v1/realtime/resync |
| GET | /api/v1/realtime/snapshot |
| POST | /api/v1/reservations |
| GET | /api/v1/reservations/:reservationCode |
| POST | /api/v1/reservations/:reservationCode/cancel |
| GET | /api/v1/reservations/availability |
| POST | /api/v1/sessions/:sessionKey/close |
| POST | /api/v1/sessions/open |
| GET | /api/v1/tables |
| GET | /api/v1/tables/:directionId |

## Canonical additions when LEGACY_API_ENABLED=true

> These routes exist under **/api/v1/** only when the legacy flag is enabled (migration-only).

| Method | Path |
|---|---|
| POST | /api/v1/admin/:orderCode(ORD[0-9A-F]{10})/status |

## Legacy mirror (/api/*) when LEGACY_API_ENABLED=true

> When **LEGACY_API_ENABLED=false**, all **/api/** routes must return **404** (contract lock).

| Method | Path |
|---|---|
| POST | /api/admin/:orderCode(ORD[0-9A-F]{10})/status |
| POST | /api/admin/cashier/settle-cash/:orderCode |
| GET | /api/admin/cashier/unpaid |
| GET | /api/admin/inventory/holds |
| POST | /api/admin/inventory/menu/bump |
| GET | /api/admin/inventory/rehydrate/metrics |
| POST | /api/admin/inventory/rehydrate/run |
| GET | /api/admin/inventory/stock |
| POST | /api/admin/inventory/stock/adjust |
| GET | /api/admin/kitchen/queue |
| POST | /api/admin/login |
| POST | /api/admin/maintenance/run |
| POST | /api/admin/maintenance/sync-table-status |
| GET | /api/admin/observability/logs |
| GET | /api/admin/observability/slow-queries |
| GET | /api/admin/ops/carts/:cartKey |
| PUT | /api/admin/ops/carts/:cartKey/items |
| DELETE | /api/admin/ops/carts/:cartKey/items/:itemId |
| POST | /api/admin/ops/carts/session/:sessionKey |
| GET | /api/admin/ops/orders/:orderCode/status |
| POST | /api/admin/ops/orders/from-cart/:cartKey |
| POST | /api/admin/ops/sessions/:sessionKey/close |
| POST | /api/admin/ops/sessions/open |
| GET | /api/admin/ops/tables |
| POST | /api/admin/orders/:orderCode/status |
| POST | /api/admin/payments/mock-success/:orderCode |
| GET | /api/admin/realtime/audit |
| GET | /api/admin/realtime/replay |
| GET | /api/admin/reservations |
| POST | /api/admin/reservations/:code/checkin |
| POST | /api/admin/reservations/:code/confirm |
| GET | /api/admin/staff |
| POST | /api/admin/staff |
| POST | /api/admin/staff/:staffId/reset-password |
| PATCH | /api/admin/staff/:staffId/role |
| PATCH | /api/admin/staff/:staffId/status |
| POST | /api/auth/logout |
| POST | /api/auth/otp/request |
| POST | /api/auth/otp/verify |
| POST | /api/auth/refresh |
| GET | /api/carts/:cartKey |
| PUT | /api/carts/:cartKey/items |
| DELETE | /api/carts/:cartKey/items/:itemId |
| POST | /api/carts/session/:sessionKey |
| GET | /api/health |
| GET | /api/menu/categories |
| GET | /api/menu/items |
| GET | /api/menu/items/:itemId |
| GET | /api/menu/items/:itemId/combo |
| GET | /api/menu/items/:itemId/meat-profile |
| GET | /api/orders/:orderCode/status |
| POST | /api/orders/from-cart/:cartKey |
| POST | /api/payments/vnpay/create/:orderCode |
| GET | /api/payments/vnpay/ipn |
| GET | /api/payments/vnpay/return |
| POST | /api/realtime/resync |
| GET | /api/realtime/snapshot |
| POST | /api/reservations |
| GET | /api/reservations/:reservationCode |
| POST | /api/reservations/:reservationCode/cancel |
| GET | /api/reservations/availability |
| POST | /api/sessions/:sessionKey/close |
| POST | /api/sessions/open |
| GET | /api/tables |
| GET | /api/tables/:directionId |
