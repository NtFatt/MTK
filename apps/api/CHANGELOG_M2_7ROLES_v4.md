# CHANGELOG — M2 (7 Roles) v4

Date: 2026-02-12

## Fixes

1) **Oversell smoke script hard-fail (sessionKey missing)**
   - `/api/v1/sessions/open` now returns top-level `sessionKey` + `sessionId` aliases (keeps `session` object intact).
   - `scripts/smoke/oversell.mjs` made tolerant to both shapes (`sessionKey` or `session.sessionKey`).

2) **Payment provider correctness + audit note quality**
   - `payments.provider` now set explicitly for VNPAY/MOCK/CASH init payments.
   - Payment success history note now uses provider (no longer hard-coded to VNPay).
   - `OrderStatusHistoryActor` now supports "STAFF" (matches DB constraint).

## 7 Roles completion (internal modules)

### OPS (STAFF / BRANCH_MANAGER / ADMIN)
Added internal, token-protected endpoints under `/api/v1/admin/ops/*` (and legacy `/api/admin/ops/*`):

- `GET    /ops/tables`
- `POST   /ops/sessions/open`
- `POST   /ops/sessions/:sessionKey/close`
- `POST   /ops/carts/session/:sessionKey`
- `GET    /ops/carts/:cartKey`
- `PUT    /ops/carts/:cartKey/items`
- `DELETE /ops/carts/:cartKey/items/:itemId`
- `POST   /ops/orders/from-cart/:cartKey`
- `GET    /ops/orders/:orderCode/status`

All OPS endpoints enforce **branch-scope** for STAFF actors (deny cross-branch).

### CASHIER
- `POST /api/v1/admin/cashier/settle/:orderCode` (permission: `payments.settle`)
  - Creates `payments` row with provider `CASH`, marks success, applies paid status + realtime event.
  - Branch-scope enforced for STAFF actors.

### KITCHEN
- `GET /api/v1/admin/kitchen/queue` already branch-scoped via token.

## Permissions

Added permissions:
- `ops.sessions.manage`, `ops.carts.manage`, `orders.create`

Updated role maps:
- STAFF / BRANCH_MANAGER / ADMIN: granted required OPS permissions.