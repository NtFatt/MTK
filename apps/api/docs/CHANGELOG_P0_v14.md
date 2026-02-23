# CHANGELOG – P0/P1 Increment v14

Date: 2026-02-09

Scope: **Realtime hardening – full recovery** (HTTP snapshot/resync endpoints) + bugfixes.

## Added

### Realtime recovery HTTP APIs

**GET** `/api/v1/realtime/snapshot?room=...` (legacy: `/api/realtime/snapshot`)

- Supports room types:
  - `sessionKey:<sessionKey>` (client)
  - `order:<orderId>` (admin OR client with `sessionKey` proof)
  - `session:<sessionId>` (admin-only)

**POST** `/api/v1/realtime/resync` (legacy: `/api/realtime/resync`)

- Batch snapshot + optional replay in one round-trip.
- Body: `{ rooms: [{ room, lastSeq? }], limit? }`

## Changed

- `realtime:gap.v1` payload now includes **resync hints**:
  - `resync.snapshotGet`
  - `resync.resyncBatchPost`
  - `resync.suggestedLastSeq`

## Fixed

- **Boot crash**: removed invalid import `application/errors/AppError.js` from `SetDevStock` (now throws `DEV_RESET_DISABLED`).
- **SocketGateway**: fixed handler block structure so `realtime:join.v1` + `realtime:replay.request.v1` are registered correctly.

## Notes

- HTTP snapshot/resync reads authoritative state from **MySQL** (sessions/tables/carts/order_items/payments). Replay window comes from Redis room log when enabled.
- If replay is disabled (or Redis not configured), snapshot still works, but `window` will be `{earliestSeq:0,currentSeq:0}`.
