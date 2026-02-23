# Hadilao FE — Handover v02 (PR-06+/PR-07)

> **Ngày:** 2026-02-15
> 
> **Mục tiêu:** hoàn thiện realtime spec (join.v1 + replay.v1 + invalidate matrix) + thay stub `/i/:branchId/tables` bằng trang Ops tables thật.

---

## 1) PR-06+ — Realtime full spec

### 1.1. Kiến trúc
- `src/shared/realtime/` chuyển sang mô hình **manager + router**:
  - `realtimeManager.ts`: singleton Socket.IO, join room, nhận `event.v1`, drop duplicate theo cursor, re-join + replay khi reconnect.
  - `joinReplay.ts`: `join.v1` + `replay.v1` (best-effort, có timeout; join forbidden → stop để tránh leak cross-branch).
  - `eventRouter.ts`: **invalidate matrix** (debounced) → invalidate React Query theo nhóm event.
  - `invalidateDebounce.ts`: debounce invalidation.
  - `socketClient.ts` + `config.ts`: cấu hình env (origin/path/room prefix/timeouts).

### 1.2. Cursor + replay
- Cursor lưu trong `sessionStorage` theo key: `cursor:<room>:<branchId>:<userKey>`.
- Mỗi room join sẽ:
  1) emit `join.v1 { room, cursor }`
  2) emit `replay.v1 { room, fromSeq: cursor+1 }`
  3) xử lý event theo seq, **không rollback cursor**.

### 1.3. Invalidate matrix (client-side)
- Mapping (best-effort):
  - `order.*` → invalidate `qk.orders.byCode(orderCode)` + prefix `['orders']`
  - `payment.*` → invalidate `orders` + `payments` + `cashier`
  - `table.*`/`session.*` → invalidate prefix `['admin','ops','tables']`
  - `inventory.*`/`menu.*` → invalidate prefix `['menu']` + `['inventory']`

### 1.4. Bootstrap
- `src/app/providers.tsx`:
  - `registerRealtimeQueryClient(queryClient)`
  - tự **start realtime nội bộ** khi internal session tồn tại (auth hydrated)
  - logout → stop realtime + clear cursors của user.

---

## 2) PR-07 — Internal Ops Tables (real)

### 2.1. Data + Query
- Endpoint: `GET /api/v1/admin/ops/tables` (query param `branchId` best-effort).
- Files:
  - `features/internal/ops/tables/services/opsTablesApi.ts`
  - `features/internal/ops/tables/hooks/useOpsTablesQuery.ts`

### 2.2. Page
- Route giữ nguyên: `/i/:branchId/tables`.
- Thay `InternalTablesStubPage` bằng `InternalTablesPage`.
- Guard:
  - Permission: `ops.tables.read` (UI 403 nếu thiếu).
  - Branch isolation: nếu không phải ADMIN mà `param branchId != session.branchId` → chặn.
- Realtime:
  - join room `${VITE_RT_INTERNAL_BRANCH_ROOM_PREFIX || 'branch'}:${branchId}`.
  - Khi BE emit `table.*`/`session.*` → tự refresh qua invalidate.

---

## 3) Env notes
- `.env.local` hiện có:
  - `VITE_API_BASE=/api/v1`
  - `VITE_SOCKET_ORIGIN=http://localhost:3001`
- Có thể override:
  - `VITE_SOCKET_PATH` (default `/socket.io`)
  - `VITE_RT_INTERNAL_BRANCH_ROOM_PREFIX` (default `branch`)
  - `VITE_RT_INVALIDATE_DEBOUNCE_MS` (default `350`)

---

## 4) Quick smoke checklist
1) Internal login OK → redirect vào tables.
2) `/i/1/tables` gọi `GET /api/v1/admin/ops/tables?branchId=1`.
3) Thiếu permission → thấy lỗi quyền.
4) Branch mismatch (role != ADMIN) → bị chặn.
5) Khi có event realtime (`table.*`/`session.*`) → query tables bị invalidate (network refetch).

