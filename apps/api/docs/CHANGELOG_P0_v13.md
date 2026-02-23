# CHANGELOG P0/P2 - v13 (2026-02-08)

## 1) Realtime hardening (Admin room)

### ✅ Replay API (đúng spec)
- **GET** `/api/v1/admin/realtime/replay?room=admin&fromSeq=1&limit=200`
  - Trả về danh sách events **tăng dần theo seq**
  - Response trả `nextFromSeq` để client gọi tiếp (paging)
  - Dùng cho cơ chế **idempotent apply**: client giữ `lastAppliedSeq`, chỉ apply event có `seq > lastAppliedSeq`

### ✅ Repo hỗ trợ replay
- `IRealtimeAdminAuditRepository.listAdminEvents()` nay hỗ trợ:
  - `fromSeq` (seq >= fromSeq)
  - `direction: asc|desc`

## 2) Observability (request-id + logs + slow query + metrics)

### ✅ Request-id end-to-end
- Middleware `requestId` nay bind vào `AsyncLocalStorage` để mọi log/DB query cùng `rid`.

### ✅ Structured logs
- `log.{debug,info,warn,error}` output JSON (prod) hoặc pretty (dev) vẫn giữ cấu trúc.
- HTTP access log được emit qua middleware `httpLogger`.

### ✅ Slow query logging
- Patch `pool.query/execute` để đo duration.
- Nếu `durationMs >= SLOW_QUERY_MS` -> log `slow_query` + increment metric.

### ✅ Basic metrics (Prometheus)
- Endpoint: `GET ${METRICS_PATH:-/api/v1/metrics}`
- Metrics:
  - `hadilao_http_requests_total{method,status}`
  - `hadilao_http_request_duration_ms_*`
  - `hadilao_db_query_duration_ms_*`
  - `hadilao_db_slow_queries_total{op}`

## 3) ENV additions
Thêm vào `.env`:
- `LOG_LEVEL=debug|info|warn|error`
- `LOG_PRETTY=true|false`
- `METRICS_ENABLED=true|false`
- `METRICS_PATH=/api/v1/metrics`
- `METRICS_REQUIRE_ADMIN=true|false`
- `SLOW_QUERY_MS=200`
## 4) Realtime hardening (Rooms replay + seq gap recovery)

### ✅ Socket events (v1)
- Client -> Server:
  - `realtime:join.v1` { rooms: [{room,lastSeq}], adminToken?, replayLimit? }
  - `realtime:replay.request.v1` { room, fromSeq, limit?, adminToken? }
- Server -> Client:
  - `realtime:hello.v1` (capabilities)
  - `realtime:event.v1` (live stream, same envelope as `event.v1`)
  - `realtime:replay.v1` (batch replay items per room)
  - `realtime:gap.v1` (seq gap too old -> require snapshot/resync)

### ✅ Replay store (best-effort, Redis ZSET per room)
- Keys:
  - `rt:seq:{room}` monotonic counter (INCR)
  - `rt:log:{room}` ZSET(score=seq, value=json)
- Retention:
  - TTL: `REALTIME_REPLAY_TTL_SECONDS`
  - Max items: `REALTIME_REPLAY_MAX_ITEMS`
- Server clamp replay size: `REALTIME_REPLAY_MAX_LIMIT`

### ✅ Seq gap policy
- Nếu `lastSeq < earliestSeq - 1` => emit `realtime:gap.v1` và **không replay** (client phải lấy snapshot mới).
- Nếu trong window => server replay `seq > lastSeq` theo thứ tự tăng dần.
