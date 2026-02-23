# PR-07 — Internal Ops Tables (real) + Realtime invalidate integration

> **Scope:** `apps/fe/**` (Vite + React + TS)
> 
> **Goal:** biến route stub `/i/:branchId/tables` thành trang Ops có dữ liệu thật từ BE contract + tự refresh bằng realtime invalidate.

---

## Non-negotiables (guardrails)
- Contract Lock: chỉ gọi `/api/v1/*` qua `VITE_API_BASE`.
- Không tự bịa endpoint. Dùng đúng route map: `GET /api/v1/admin/ops/tables`.
- RBAC: route/action guard theo permission `ops.tables.read`.
- Branch isolation: nếu không phải ADMIN mà `branchId param` ≠ `session.branchId` → chặn (403 UI).
- Realtime: không connect/disconnect theo page; chỉ join room.

---

## Tasks
1) **Data layer (internal ops tables)**
   - Tạo `features/internal/ops/tables/services/opsTablesApi.ts`:
     - `fetchOpsTables({ branchId? })` → gọi `apiFetchAuthed('/admin/ops/tables?branchId=...')`.
     - Normalize payload (array trực tiếp hoặc `{ items: [...] }`).

2) **Query hook**
   - `useOpsTablesQuery(branchId, enabled)` với `useAppQuery`.
   - Query key local: `['admin','ops','tables',{branchId}]` (TODO migrate sang `qk.*` khi contracts có).

3) **Page UI**
   - Replace `InternalTablesStubPage` bằng `InternalTablesPage`.
   - States: loading (skeleton), error (inline), empty.
   - Render list table cards: code + status badge + optional sessionKey/cartKey.

4) **Realtime join + invalidate**
   - Join room theo config: `${VITE_RT_INTERNAL_BRANCH_ROOM_PREFIX || 'branch'}:${branchId}`.
   - Invalidation đã route ở `shared/realtime/eventRouter.ts`:
     - `table.*` / `session.*` → invalidate prefix `['admin','ops','tables']`.

---

## How to test
1) Login internal `/i/login`.
2) Vào `/i/1/tables`.
3) Confirm call `GET /api/v1/admin/ops/tables?branchId=1` trả list.
4) Khi backend emit event `table.*` hoặc `session.*` vào room branch, UI tự refresh (React Query invalidate).
5) Nếu user role != ADMIN, thử vào branch khác → thấy block “không được phép”.

