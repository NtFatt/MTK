# PR-05 — Checkout + Create Order (Idempotency) + Order Status Page (Contract-first) — Cursor Prompt

> **Repo:** `hadilao-online` (pnpm workspace)  
> **Scope PR:** chỉ thay đổi trong `apps/fe/**`  
> **Hiện trạng:** PR-00..PR-04 đã pass. Customer flow `/c/*` đã có session + cart CRUD.  
> **Mục tiêu PR-05:** có thể **đặt món** từ cart → tạo order (idempotent) → xem trang trạng thái order.

---

## 0) HARD CONSTRAINTS (KHÔNG ĐƯỢC VI PHẠM)

1) **Không dùng Next APIs.**  
2) **Không đoán contract.** Trước khi code phải mở và xác định từ `@hadilao/contracts` / OpenAPI / docs trong repo:
   - Endpoint tạo order (POST)
   - Endpoint lấy order detail/tracking (GET)
   - Payment endpoints (nếu tồn tại) — PR-05 chỉ cần “init payment” (optional)  
   - Fields bắt buộc: cartId/sessionKey, items, note, optionsHash, totals…
3) **Contract Lock:** chỉ gọi `/api/v1/*` (qua `apiFetch` hoặc wrapper).  
4) **Không để UI gọi fetch trực tiếp.** Tách `services/` + `hooks/`.  
5) **Idempotency bắt buộc** cho create order (và payment nếu làm). Dùng `Idempotency-Key` header **không đoán tên khác**; nếu contracts dùng header khác → follow contract.  
6) **DoD phải pass**:
   - `pnpm -C apps/fe lint`
   - `pnpm -C apps/fe typecheck`
   - `pnpm -C apps/fe build`
   - `pnpm -C apps/fe dev`

---

## 1) MỤC TIÊU PR-05

### 1.1 Route mới (customer)
- `/c/checkout` — checkout page (guard RequireCustomerSession)
- `/c/orders/:orderId` (hoặc `:orderCode`) — order status page (guard RequireCustomerSession)

> Nếu contracts dùng `orderCode` thay vì numeric id, route param phải theo đúng kiểu đó.

### 1.2 Checkout flow (MVP nhưng enterprise)
- Load cart by sessionKey
- Hiển thị summary + total
- Input note (optional)
- Chọn phương thức thanh toán (UI-only nếu contract chưa có)
- Nút **“Đặt món”**:
  - call createOrder mutation
  - attach idempotency key
  - disable button khi pending
  - success → redirect order status page

### 1.3 Order status page
- Fetch order detail theo param + session scope
- Hiển thị status (PENDING/CONFIRMED/PREPARING/SERVED/CANCELLED/PAID… theo contract)
- Có “Thử lại” refetch + hiển thị correlationId khi lỗi
- Nếu order không thuộc session/branch → show 403/404 message rõ

### 1.4 Error discipline (quan trọng)
- 409 (oversell/hold fail / cart mismatch) → show Alert + refetch cart + không crash
- 401/403 → show message + link về `/c/qr` (customer không có internal auth)
- 5xx/network → show “Thử lại”

---

## 2) FILE/FOLDER PLAN (PHẢI ĐÚNG PATH)

### 2.1 Shared idempotency (customer-safe)
```
apps/fe/src/shared/http/
  idempotency.ts
```

### 2.2 Order feature
```
apps/fe/src/features/customer/order/
  types.ts
  services/orderApi.ts
  hooks/useCreateOrderMutation.ts
  hooks/useOrderQuery.ts
  pages/CustomerCheckoutPage.tsx
  pages/CustomerOrderStatusPage.tsx
  components/CheckoutSummary.tsx
  components/CheckoutNote.tsx
  components/OrderStatusCard.tsx
  components/OrderTimeline.tsx   (optional, simple)
```

> Không refactor lại cart/menu trong PR-05 ngoài việc “điều hướng” và hiển thị CTA.

---

## 3) IMPLEMENTATION DETAILS (BẮT BUỘC)

### 3.1 idempotency.ts
- Export:
  - `createIdempotencyKey(): string` → dùng `crypto.randomUUID()` (không thêm dependency)
  - `getOrCreateIdempotencyKey(scope: string): string` → lưu sessionStorage theo key `hadilao.idem.<scope>`
  - `clearIdempotencyKey(scope: string): void`
- Scope gợi ý:
  - `order.create.<sessionKey>`
  - `payment.init.<orderId>` (nếu làm payment)

> Khi create order thành công → **clear key** để lần sau không bị replay nhầm.

### 3.2 order types (contract-first)
**`types.ts`**
- `OrderStatus` là union string lấy từ contracts (đừng tự bịa). Nếu contracts export enum/type thì import.
- `Order` minimal:
  - `id` hoặc `code`
  - `status`
  - `items[]` (name, qty, price)
  - `total`
  - `createdAt`
  - (optional) `tableCode`, `branchId`, `sessionKey`

### 3.3 orderApi.ts (đọc contracts trước khi code)
- Must implement tối thiểu:
  - `createOrder(params)` → POST create order
  - `getOrder(params)` → GET order detail
- Cart/session scoping:
  - Nếu createOrder cần `cartId` → lấy từ cart query result.
  - Nếu cần `sessionKey` → lấy từ store.
- Header:
  - Idempotency header name theo contracts (default: `Idempotency-Key`).
  - Attach correlation id? không cần.

Tất cả gọi thông qua `apiFetch` (customer không dùng `apiFetchAuthed`).

### 3.4 hooks
**`useCreateOrderMutation.ts`**
- dùng `useAppMutation`
- onMutate: tạo/đọc idempotency key cho scope session
- pass header vào `apiFetch` options (headers)
- onSuccess:
  - clear idempotency key
  - invalidate cart query key (cart nên empty/reset sau order) nếu contract thực sự resets
  - navigate sang order status page
- onError:
  - giữ idempotency key (để retry an toàn)
  - normalize error (HttpError) cho UI

**`useOrderQuery.ts`**
- dùng `useAppQuery`
- staleTime 2–5s (status có thể đổi)
- enable polling nhẹ: `refetchInterval` 3000–5000ms (optional) **chỉ khi status chưa terminal**
  - terminal statuses: PAID/CANCELLED/SERVED… (theo contract). Nếu không biết, implement conservative: polling max 30s rồi dừng.

### 3.5 Checkout page
**`CustomerCheckoutPage.tsx`**
- guard RequireCustomerSession
- load cart (useCartQuery)
- nếu cart empty → show `CartEmpty` + link `/c/menu`
- render:
  - `CheckoutSummary` (items + totals)
  - `CheckoutNote` (textarea hoặc input)
  - CTA Button “Đặt món”
- Khi click:
  - build payload theo contract:
    - cartId (nếu required)
    - note
    - (optional) paymentMethod
  - call mutation
- Error UI: dùng `Alert` destructive + message + correlationId

### 3.6 Order status page
**`CustomerOrderStatusPage.tsx`**
- guard RequireCustomerSession
- đọc param `orderId|orderCode`
- call `useOrderQuery`
- render `OrderStatusCard` + `OrderTimeline` (simple)
- CTA:
  - “Quay lại menu” → `/c/menu`
  - “Xem giỏ hàng” → `/c/cart`
- Nếu error 404/403 → message rõ

### 3.7 Router updates
Update `apps/fe/src/app/router.tsx`:
- Add:
  - `/c/checkout` → `CustomerCheckoutPage` (guard)
  - `/c/orders/:orderId` (hoặc code) → `CustomerOrderStatusPage` (guard)
- Update `CustomerCartPage` CTA “Tiếp tục thanh toán” trỏ đúng `/c/checkout` (đã stub).

---

## 4) QA / GATES (BẮT BUỘC)

Chạy:
1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`
4) `pnpm -C apps/fe dev` manual:
   - Flow: `/c/qr` → open session → `/c/menu` add items → `/c/cart` → `/c/checkout` → create order → `/c/orders/:id`
   - BE down: checkout/order page show error UI (không crash)
   - Retry create order: đảm bảo idempotency key giữ để không tạo duplicate

---

## 5) COMMIT MESSAGE

`fe: PR-05 checkout + create order (idempotency) + order status page`

---

## 6) STOP RULE (KHÔNG ĐƯỢC ĐOÁN CONTRACT)

Nếu không tìm thấy create order endpoint/fields trong contracts:
- vẫn implement UI pages + idempotency helper + wiring skeleton,
- disable CTA “Đặt món” với message “Missing contract endpoint for order create”,
- TODO rõ ràng.

