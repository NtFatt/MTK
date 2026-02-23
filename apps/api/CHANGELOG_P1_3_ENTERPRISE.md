# Hadilao API - Patch P1.3 (Enterprise)

Date: 2026-02-08

Patch focus: **Redis session store + Redis atomic stock holds + realtime rooms + smoke improvements**.

## Redis session store (sess:*)
- Added `RedisTableSessionRepository` and `REDIS_SESSION_STORE_ENABLED`.
- Caches session lookups (`findBySessionKey`, `findById`) in Redis with TTL (`REDIS_SESSION_TTL_SECONDS`).
- Keeps MySQL `table_sessions` as source of truth; Redis acts as a fast read-through cache.

## Redis atomic stock holds (holds:*)
- Added `RedisStockHoldService` with Lua scripts for atomic:
  - hold delta update (DECR/INCR) against Redis stock key
  - release expired holds back to stock
- Stable hold key signature:
  - `holds:{cartKey}:{branchId}:{itemId}:{optionsHash}:{noteHash}`
- Background cleanup job in `src/main/server.ts` (configurable interval).

## Cart / order lifecycle wiring
- Cart upsert/remove now updates Redis holds (reserve/release) before persisting to MySQL.
- Order checkout consumes all cart holds atomically and marks cart checked-out.
- Closing a table session now:
  - marks active cart as `ABANDONED`
  - releases remaining holds for that cart
  - emits `cart.abandoned` realtime event.

## Socket.IO rooms (enterprise admin)
- Standardized rooms:
  - `admin`
  - `branch:{branchId}`
  - `order:{orderId}`
  - `sessionId:{sessionId}` / `sessionKey:{sessionKey}`
- Join flow normalized with auth:
  - `join { admin: true, adminToken }`
  - `join { branchId, adminToken }`
  - `join { orderId, adminToken }`
  - `join { sessionKey }` (public)

## Smoke updates
- Postman env adds:
  - `socketPath` (default `/socket.io`)
  - `smokeRealtime` (default `false`)
- `pnpm smoke` now exports the Postman environment after Newman run.
- Optional realtime sanity:
  - Enabled by setting `smokeRealtime=true`
  - Script: `scripts/smoke/realtime-sanity.mjs` connects Socket.IO, joins rooms, triggers `cart.updated` and asserts the event.

## How to enable Phase-1 features

Environment:
- `REDIS_URL=redis://localhost:6379`
- `REALTIME_ENABLED=true` (or keep default auto when `REDIS_URL` exists)
- `REDIS_SESSION_STORE_ENABLED=true`
- `REDIS_STOCK_HOLDS_ENABLED=true`

Smoke:
- Set `smokeRealtime=true` in `postman/Hadilao_Smoke_Local.postman_environment.json`.
