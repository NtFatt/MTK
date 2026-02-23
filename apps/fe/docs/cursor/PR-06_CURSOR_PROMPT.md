# PR-06 — Realtime nền tảng chuẩn v7 (Socket manager singleton + join.v1/replay.v1 + event router + invalidate) — Cursor Prompt

> **Repo:** `hadilao-online` (pnpm workspace)  
> **Scope PR:** chỉ thay đổi trong `apps/fe/**`  
> **Hiện trạng:** PR-00..PR-05 đã pass. Customer flow `/c/*` có session+cart+checkout+order status (polling). Internal `/i/*` có OTP auth + refresh single-flight + guards.

---

## 0) HARD CONSTRAINTS (KHÔNG ĐƯỢC VI PHẠM)

1) **Không dùng Next APIs.**  
2) **Không đoán protocol realtime.** Trước khi code, phải mở và xác định từ repo (source of truth):
   - `docs/BE_SPEC.md` (nếu có)
   - `packages/contracts/**` (nếu có định nghĩa event envelope / join payload)
   - Backend code (nếu repo có `apps/api/...SocketGateway...` hoặc docs runtime) để biết **tên event** (vd `order.updated` hay `order:status_changed.v1`) và **payload join/replay**.
   > Nếu không tìm thấy định nghĩa rõ ràng: implement infra **mềm** (pluggable), join/replay để TODO rõ ràng và **không phá UX** (giữ polling fallback).
3) **Chỉ 1 socket connection/tab** (singleton), **không connect/disconnect theo page mount/unmount**.  
4) **Realtime chỉ dùng để invalidate/refetch hoặc update nhẹ**; server truth vẫn là TanStack Query.  
5) **Branch isolation**: internal chỉ join rooms trong branch scope; nếu server trả forbidden khi join → disconnect + UX error rõ.  
6) **Replay cursor**: lưu theo key `cursor:{room}:{branchId}:{userKey}` (userKey = internal userId; customer dùng sessionKey).  
7) **DoD phải pass**:
   - `pnpm -C apps/fe lint`
   - `pnpm -C apps/fe typecheck`
   - `pnpm -C apps/fe build`
   - `pnpm -C apps/fe dev`

---

## 1) MỤC TIÊU PR-06

### 1.1 Nền tảng realtime chuẩn
- `shared/realtime` có:
  - Socket manager singleton (connect, disconnect, reconnect policy)
  - join.v1 + replay.v1 (theo protocol BE) + cursor persistence
  - Event router: nhận EventEnvelope → debounce invalidate query keys (250–500ms)
  - API cho features: `useRealtimeRoom(room, enabled)` hoặc `realtime.join(room)`

### 1.2 Integrations tối thiểu (để chứng minh realtime hoạt động)
- **Customer order tracking**: trang `/c/orders/:orderCode`
  - join room `order:<id/code>` nếu khả dụng
  - khi nhận event `order.*` → invalidate query của order status (và stop polling sớm nếu muốn)
  - nếu socket/protocol không sẵn sàng → giữ polling hiện tại (đã có) và không crash
- **Internal tables stub**: `/i/:branchId/tables`
  - join room `ops:<branchId>` (hoặc `branch:<branchId>` tùy BE)
  - nhận event `table.* / session.*` → invalidate queries tables (placeholder mapping)

---

## 2) FILE/FOLDER PLAN (PHẢI ĐÚNG PATH)

Tạo/điền các file sau:

```
apps/fe/src/shared/realtime/
  types.ts
  config.ts
  cursorStore.ts
  socketClient.ts
  joinReplay.ts
  eventRouter.ts
  invalidateDebounce.ts
  realtimeManager.ts
  useRealtimeRoom.ts
  index.ts
```

Optional (nhưng khuyến nghị):
```
apps/fe/src/shared/realtime/devPanel.tsx   # nhỏ gọn: hiển thị socket status (dev only)
```

Update nhỏ ở:
- `apps/fe/src/app/providers.tsx` (hook bootstrap / wiring lifecycle)
- `apps/fe/src/features/customer/order/pages/CustomerOrderStatusPage.tsx` (join order room)
- `apps/fe/src/features/internal/auth/pages/InternalTablesStubPage.tsx` (join ops/branch room)

---

## 3) IMPLEMENTATION DETAILS (BẮT BUỘC)

### 3.1 types.ts
Định nghĩa envelope theo spec (linh hoạt):
```ts
export type EventEnvelope<TPayload = unknown> = {
  type: string;      // ví dụ "order.updated" hoặc "order:status_changed.v1"
  room: string;      // room mà event phát ra
  seq: number;       // tăng dần theo room
  ts: string;        // ISO
  payload: TPayload;
};
```

Ngoài ra define:
- `SocketStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR"`
- `JoinResult` / `ReplayResult` theo đúng BE (nếu chưa rõ, dùng `unknown` + TODO).

### 3.2 config.ts
- Tạo config cho socket:
  - `path` = `"/socket.io"` (ưu tiên theo proxy Vite đã có ws)
  - `withCredentials` theo BE (nếu BE dùng cookie refresh)
  - `reconnectBackoff`: base 500ms, max 10s, jitter 0.2
- **Không hardcode origin**; dùng relative URL để Vite proxy hoạt động (`io({ path: "/socket.io" })`).

### 3.3 cursorStore.ts
- API:
  - `getCursor(room, branchId, userKey): { seq: number; ts?: string } | null`
  - `setCursor(room, branchId, userKey, cursor): void`
  - `clearCursorsForUser(userKey): void`
  - `clearAllCursors(): void`
- Storage: `sessionStorage` (ưu tiên) hoặc `localStorage` (nếu muốn survive reload lâu).
- Key format bắt buộc: `cursor:{room}:{branchId}:{userKey}`
- Rule:
  - Không rollback cursor.
  - Nếu nhận event có `seq <= cursor.seq` → drop (out-of-order/duplicate).

### 3.4 socketClient.ts (singleton low-level)
- Export `getSocket()` trả về 1 instance Socket.IO client (lazy init).
- Không auto-connect khi import; connect qua manager.
- Setup listeners:
  - `connect`, `disconnect`, `connect_error`
  - `reconnect_attempt` (nếu lib expose)
- Không log token.

### 3.5 joinReplay.ts
**BẮT BUỘC:** trước khi implement, tìm protocol thật trong repo:
- Tên event join/replay (join.v1/replay.v1 đúng spec)
- Payload shape (rooms[], cursorByRoom?, branchId?, userId?)
- Ack shape (ok/error, replay items...)

Implement theo source of truth.
Nếu không tìm thấy:
- implement join nhẹ theo dạng:
  - `socket.emit("join.v1", { room, cursor }, ack => ...)`
  - `socket.emit("replay.v1", { room, fromSeq }, ack => ...)`
- Và để TODO rõ ràng “confirm BE join/replay payload”.

Phải hỗ trợ:
- join nhiều room
- replay theo cursor (seq)
- fallback nếu server từ chối replay: reset cursor + invalidate full.

### 3.6 invalidateDebounce.ts
- Debounce invalidation 250–500ms:
  - key theo queryKey JSON string
  - accumulate events burst → chỉ invalidate 1 lần

### 3.7 eventRouter.ts (core)
- Nhận `EventEnvelope`
- Validate seq vs cursor; drop nếu cũ
- Map `type` → list query keys cần invalidate (theo matrix)
- Debounced invalidate
- Update cursor sau khi xử lý xong

**Event-to-invalidate mapping (gợi ý theo FE Spec v2 Appendix B):**
- `order.*` → invalidate `qk.orders.detail(orderId/orderCode)` (và list nếu có)
- `payment.*` → invalidate order detail + payments list (internal)
- `table.*` / `session.*` → invalidate tables list (internal ops)
- `kitchen.*` → invalidate kitchen queue (future)
- `inventory.*` → invalidate inventory stock; optional invalidate menu cache
- `admin.audit.*` → invalidate audit feed (future)

**Quan trọng:** event type BE có thể dùng dấu `:` và suffix `.v1`. Router phải match linh hoạt:
- match prefix `order` (cả `order.` và `order:`)
- tương tự cho `payment`, `table`, `session`, `kitchen`, `inventory`, `admin.audit`

### 3.8 realtimeManager.ts (high-level orchestration)
- State store (nội bộ module, không cần Zustand):
  - status, lastError
  - joinedRooms Set<string>
- API:
  - `start(ctx)`
  - `stop(reason?)`
  - `joinRoom(room, opts?)`
  - `leaveRoom(room)` (optional; có thể không rời để đơn giản)
  - `getStatus()` / subscribe (hook)
- `ctx` bao gồm:
  - `kind: "internal" | "customer"`
  - `branchId?: string|number`
  - `userKey: string` (internal userId hoặc customer sessionKey)
  - `token?: string` (nếu BE yêu cầu Bearer token trong socket auth)
- start() phải:
  - init socket auth handshake (nếu protocol yêu cầu: `io({ auth: { token } })`)
  - connect
  - join baseline room:
    - internal: `branch:<branchId>` (và/hoặc role room nếu có)
    - customer: chỉ join khi feature yêu cầu (order room)
- stop() phải:
  - disconnect socket
  - clear joinedRooms
  - clear cursors theo userKey (theo spec: logout clear cursor)

**Reconnect behavior**
- on reconnect:
  - re-join rooms
  - replay theo cursor cho từng room
  - nếu replay fail → reset cursor + invalidate full

### 3.9 useRealtimeRoom.ts
Hook đơn giản để feature “đăng ký room” theo vòng đời page:
```ts
export function useRealtimeRoom(room: string | null, enabled: boolean, opts?: { branchId?: string|number; userKey?: string }) {}
```
- Khi enabled true + room != null → joinRoom
- Cleanup: có thể no-op (giữ join) hoặc leaveRoom (optional)
- Không tạo connect/disconnect mỗi lần; chỉ join/unjoin thông qua manager singleton.

---

## 4) WIRING LIFECYCLE (BẮT BUỘC)

### 4.1 providers.tsx
Sau khi auth/session hydrate:
- Nếu internal authed → `realtimeManager.start({ kind:"internal", branchId, userKey:user.id, token:accessToken })`
- Nếu logout → `realtimeManager.stop("logout")`
- Customer:
  - Nếu hiện chưa có customer auth token → **không start mặc định** (tránh đoán handshake).
  - Realtime cho customer chỉ bật khi order status page join (manager có thể start “anonymous” với userKey=sessionKey nếu BE cho phép; nếu không thì skip).

### 4.2 CustomerOrderStatusPage.tsx
- Sau khi có order data:
  - xác định room id ưu tiên:
    - nếu order trả `id` → `order:<id>`
    - else dùng `order:<orderCode>`
- Call `useRealtimeRoom(room, true)`
- Khi nhận event `order.*`:
  - invalidate order query key (router sẽ làm)
  - (optional) giảm polling: nếu socket CONNECTED thì `refetchInterval` có thể tắt hoặc tăng lên (đừng refactor lớn; tối thiểu giữ behavior hiện tại).

### 4.3 InternalTablesStubPage.tsx
- Lấy branchId từ route param
- Join room `ops:<branchId>` hoặc `branch:<branchId>` (theo BE)
- Router invalidate mapping cho `table.* / session.*` (dù queries chưa có, vẫn để placeholder mapping sạch).

---

## 5) QA / GATES (BẮT BUỘC)

Chạy:
1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`
4) `pnpm -C apps/fe dev` manual:
   - `/c/orders/:orderCode` (socket on/off đều không crash)
   - `/i/login` → login → `/i/:branchId/tables` (socket connected + join room)
   - Toggle BE realtime off → FE phải show error state nhẹ (status ERROR) và vẫn chạy bằng polling/refetch.

**Không được** để socket spam refetch (đảm bảo debounce invalidate).

---

## 6) COMMIT MESSAGE

`fe: PR-06 realtime infra (singleton socket + join/replay + event invalidate router)`

---

## 7) STOP RULE (KHÔNG ĐƯỢC ĐOÁN)

Nếu không xác định được:
- event names chuẩn (vd `order.updated` vs `order:status_changed.v1`)
- join/replay payload/ack
→ implement infra “pluggable” + TODO rõ + giữ polling fallback. Không phát minh handshake rồi làm hỏng demo.

