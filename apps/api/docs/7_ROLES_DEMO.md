# 7 Roles Demo (Demo 10/10) — Current Capabilities & Proof Points

> Source of truth: ROUTE_MAP.md + RBAC SSoT (src/domain/rbac/permissions.ts)

## Roles

### 1) GUEST (public)
**Can**
- Browse menu: `GET /api/v1/menu/*`
- Check reservation availability: `GET /api/v1/reservations/availability`

**Enterprise proof**
- Public GET responses ship caching headers + weak ETag (304 supported):
  - `Cache-Control: public, max-age=...`
  - `ETag: W/"..."`

---

### 2) CLIENT (external auth)
**Can**
- OTP login/register:
  - `POST /api/v1/client/otp/request`
  - `POST /api/v1/client/otp/verify`
- Refresh token rotation:
  - `POST /api/v1/client/refresh`
- Logout / revoke refresh token:
  - `POST /api/v1/client/logout`

**Enterprise proof**
- Rate limit (Redis-backed): OTP request/verify are limited by IP-prefix + identity + device fingerprint.

---

### 3) STAFF (internal, branch-scoped)
**Can** (branch-scoped ops)
- Tables list: `GET /api/v1/admin/ops/tables`
- Session open/close:
  - `POST /api/v1/admin/ops/sessions/open`
  - `POST /api/v1/admin/ops/sessions/:sessionKey/close`
- Cart ops (branch-scoped): `GET/PUT` under `/api/v1/admin/ops/carts/*`
- Create order from cart: `POST /api/v1/admin/ops/orders/from-cart/:cartKey`
- Order status read: `GET /api/v1/admin/ops/orders/:orderCode/status`

**Enterprise proof**
- NEG-03 (Branch mismatch) anti-leak: with STAFF token, cross-branch orderCode always returns 403.

---

### 4) KITCHEN (internal, branch-scoped)
**Can**
- Queue read: `GET /api/v1/admin/kitchen/queue`
- Change order status (limited): `POST /api/v1/admin/orders/:orderCode/status`
  - Allowed: `NEW -> RECEIVED -> READY` only
  - Forbidden: setting `PAID` (always 403)

**Enterprise proof**
- Strict transition validation (NEG-04): invalid status transitions return 409 `INVALID_TRANSITION`.

---

### 5) CASHIER (internal, branch-scoped)
**Can**
- Unpaid list: `GET /api/v1/admin/cashier/unpaid`
- Settle cash payment: `POST /api/v1/admin/cashier/settle-cash/:orderCode`

**Enterprise proof**
- Idempotency required (M2): must send `Idempotency-Key` header.
- Repeat with same key returns the same result.

---

### 6) BRANCH_MANAGER (internal)
**Can**
- Everything STAFF/KITCHEN/CASHIER can do
- Inventory read/holds + drift metrics:
  - `GET /api/v1/admin/inventory/stock`
  - `GET /api/v1/admin/inventory/holds`
  - `GET /api/v1/admin/inventory/rehydrate/metrics`

---

### 7) ADMIN (internal, global)
**Can**
- Full access to admin routes (maintenance, staff, observability, realtime)
- Contract lock demo (M0): legacy `/api/*` is OFF by default (`LEGACY_API_ENABLED=false`) and returns 404.

---

## Realtime rooms (Socket.IO)

Join via `realtime:join.v1` with payload `{ adminToken?, sessionKey?, rooms:[{room,lastSeq}] }`.

Allowed room patterns:
- `admin` (ADMIN only)
- `branch:<branchId>` (ADMIN or STAFF matching branch)
- `kitchen:<branchId>` (ADMIN or KITCHEN/BRANCH_MANAGER matching branch)
- `cashier:<branchId>` (ADMIN or CASHIER/BRANCH_MANAGER matching branch)
- `session:<sessionId>` (internal; branch-scoped)
- `sessionKey:<sessionKey>` (public)
- `order:<orderCode>` / `order:<orderId>` (scoped)

## Smoke commands
- Core flow: `pnpm smoke`
- Full 7 roles: `pnpm smoke:full`
- Negative pack: `pnpm smoke:negative`
- Realtime sanity: `pnpm smoke:realtime`
