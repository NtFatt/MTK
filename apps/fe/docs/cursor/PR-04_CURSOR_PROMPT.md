# PR-04 — Customer Session Bootstrap + Cart (Contract-first, /c namespace) — Cursor Prompt (COPY/PASTE)

> **Repo:** `hadilao-online` (pnpm workspace)  
> **Scope PR:** chỉ thay đổi trong `apps/fe/**`  
> **Hiện trạng:** PR-00/01/02/03 đã pass.  
> - `/customer/menu` đang chạy (menu API + mock fallback)  
> - Internal `/i/*` đã có OTP auth + guards  
> **Mục tiêu PR-04:** đưa customer flow về đúng spec: `/c/qr → /c/session/:sessionKey → /c/menu → /c/cart` và wire cart mutations theo contract.

---

## 0) HARD CONSTRAINTS (KHÔNG ĐƯỢC VI PHẠM)

1) **Không dùng Next APIs.**  
2) **Không đoán contract.** Trước khi code, phải mở `@hadilao/contracts` + docs trong repo để xác định:
   - Payload/response của `POST /api/v1/sessions/open`
   - `GET /api/v1/sessions/:sessionKey`
   - Cart endpoints: `POST /api/v1/cart/items`, `PATCH /api/v1/cart/items/:id`, `DELETE /api/v1/cart/items/:id`, `GET /api/v1/cart (nếu có)`  
   - Cách truyền `sessionKey` cho cart (path? query? header?) → **đọc contract, không tự bịa**.
3) **Contract Lock:** chỉ gọi `/api/v1/*` (đã có `apiFetch`).  
4) **UI không gọi fetch trực tiếp.** Tách `services/` + `hooks/`.  
5) **Không phá PR-02 data layer**: dùng `useAppQuery/useAppMutation` + `normalizeApiError`.  
6) **DoD phải pass**:
   - `pnpm -C apps/fe lint`
   - `pnpm -C apps/fe typecheck`
   - `pnpm -C apps/fe build`
   - `pnpm -C apps/fe dev`

---

## 1) MỤC TIÊU PR-04 (THEO FE SPEC v2)

### 1.1 Customer routes chuẩn hoá `/c/*`
- `/c/qr` — page nhập branch/table (hoặc QR token) để mở session (POST sessions/open)
- `/c/session/:sessionKey` — bootstrap page: load session, set “current session” trong store, rồi redirect `/c/menu`
- `/c/menu` — dùng lại UI menu (PR-01/02) nhưng **lấy branch/session context** (nếu cần)
- `/c/cart` — cart page, CRUD items theo contract

### 1.2 Legacy aliases (giữ để không gãy demo)
- `/customer/menu` → redirect `/c/menu`
- (Optional) `/customer/*` khác: redirect-only, không thêm feature mới
- `/` (nếu đang redirect /customer/menu) → redirect `/c/menu` hoặc `/c/qr` (ưu tiên `/c/qr` vì đúng flow)

### 1.3 Session context (customer)
- Lưu `sessionKey`, `branchId`, `tableCode` (nếu contract có) trong store + sessionStorage
- Nếu không có sessionKey → `/c/menu` và `/c/cart` phải redirect `/c/qr`

### 1.4 Cart + Menu integration tối thiểu
- Button “Thêm” trong MenuCard → gọi `POST /api/v1/cart/items`
- Navbar hiển thị link “Giỏ hàng” (kèm badge count nếu có data) → `/c/cart`
- Cart page cho phép:
  - update quantity (PATCH)
  - remove item (DELETE)
- Oversell / hold fail (409) → show Alert + refetch cart + không crash

---

## 2) FILE/FOLDER PLAN (PHẢI ĐÚNG PATH)

### 2.1 Shared customer session
```
apps/fe/src/shared/customer/session/
  types.ts
  storage.ts
  sessionStore.ts
  sessionApi.ts
  useSessionQuery.ts
  useOpenSessionMutation.ts
  guards.tsx
```

### 2.2 Customer pages/features
```
apps/fe/src/features/customer/qr/pages/CustomerQrPage.tsx
apps/fe/src/features/customer/session/pages/CustomerSessionBootstrapPage.tsx

apps/fe/src/features/customer/cart/
  types.ts
  services/cartApi.ts
  hooks/useCartQuery.ts
  hooks/useCartMutations.ts
  pages/CustomerCartPage.tsx
  components/CartItemRow.tsx
  components/CartSummary.tsx
  components/CartEmpty.tsx
```

### 2.3 Menu updates (nhỏ, không refactor lớn)
- `apps/fe/src/features/customer/menu/components/MenuCard.tsx` (wire “Thêm”)
- `apps/fe/src/features/customer/menu/components/CustomerNavbar.tsx` (link + badge count)
- `apps/fe/src/features/customer/menu/pages/CustomerMenuPage.tsx` (route path đổi sang `/c/menu`, giữ component)

### 2.4 Shared UI (bổ sung nếu cần, tối thiểu)
```
apps/fe/src/shared/ui/dialog.tsx    (optional: nếu bạn muốn confirm remove)
apps/fe/src/shared/ui/select.tsx    (optional: nếu qr page cần dropdown branch/table)
```
> Ưu tiên dùng những primitives đã có: `Button`, `Card`, `Input`, `Label`, `Alert`, `Badge`, `Separator`.

---

## 3) IMPLEMENTATION DETAILS (BẮT BUỘC)

### 3.1 Session types + storage + store
**`shared/customer/session/types.ts`**
- `CustomerSession` tối thiểu:
  ```ts
  export type CustomerSession = {
    sessionKey: string;
    branchId?: number | string;
    tableCode?: string;
    openedAt?: string;
    expiresAt?: number;
  };
  ```

**`storage.ts`**
- sessionStorage key: `hadilao.customer.session`
- `loadCustomerSession()`, `saveCustomerSession()`, `clearCustomerSession()`

**`sessionStore.ts`**
- Zustand store:
  - `session: CustomerSession | null`
  - `isHydrated: boolean`
  - `hydrate()`
  - `setSession(session)`
  - `clear()`
- Selectors:
  - `selectSessionKey`, `selectBranchId`, `selectTableCode`, `selectHasSession`

**`guards.tsx`**
- `RequireCustomerSession`:
  - hydrate if needed
  - if no session → redirect `/c/qr`
  - else render children

> Tuyệt đối không trộn với internal `shared/auth/*` (đó là staff/admin).

### 3.2 Session API (đọc contract trước)
**`sessionApi.ts`**
- `openSession(payload)` → `POST /api/v1/sessions/open`
- `getSession(sessionKey)` → `GET /api/v1/sessions/:sessionKey`

Payload field names phải lấy từ contracts. Nếu contract dùng `{ branchId, tableCode }` hoặc `{ qrToken }`… thì follow đúng.

**`useOpenSessionMutation.ts`**
- Wrap bằng `useAppMutation`
- On success:
  - save store + storage
  - navigate `/c/session/<sessionKey>` (để bootstrap consistent)

**`useSessionQuery.ts`**
- `useSessionQuery(sessionKey)` dùng `useAppQuery`
- staleTime 30s–1m (session state thay đổi)
- normalize error

### 3.3 QR Entry page: `/c/qr`
**`CustomerQrPage.tsx`**
- UI tối thiểu:
  - Input `branchId` (number/string)
  - Input `tableCode` (string)
  - Button “Mở bàn”
- Validate:
  - required fields
  - offline (`navigator.onLine === false`) → disable submit + alert
- Khi submit:
  - call `openSessionMutation.mutateAsync(payload)`
- Error mapping:
  - 400 → show message
  - 409 (NO_TABLE_AVAILABLE) → show message rõ + retry

> Không làm camera scan trong PR-04.

### 3.4 Bootstrap page: `/c/session/:sessionKey`
**`CustomerSessionBootstrapPage.tsx`**
- Read `sessionKey` from params
- Call `useSessionQuery(sessionKey)`
- On success:
  - setSession into store/storage (overwrite if different)
  - navigate `/c/menu` (replace)
- Loading → skeleton/alert
- Error → show message + “Quay lại /c/qr”

### 3.5 Router updates (BẮT BUỘC)
Update `src/app/router.tsx`:
- Add routes:
  - `/c/qr` → `CustomerQrPage`
  - `/c/session/:sessionKey` → `CustomerSessionBootstrapPage`
  - `/c/menu` → `CustomerMenuPage` (wrap by `RequireCustomerSession`?)
  - `/c/cart` → `CustomerCartPage` (wrap by `RequireCustomerSession`)
- Legacy redirects:
  - `/customer/menu` → `/c/menu`
  - `/internal` giữ nguyên redirect `/i/login` (đã có)
- Default `/`:
  - redirect `/c/qr` (đúng flow).

Add hydrate runner trong `providers.tsx`:
- gọi `customerSessionStore.hydrate()` (tương tự auth hydrate internal).

### 3.6 Cart API + hooks (đọc contract trước)
**Quan trọng:** phải xác định cách truyền `sessionKey` cho cart endpoints.
- Nếu contract yêu cầu header (vd: `X-Session-Key`), implement trong `cartApi` bằng `headers`.
- Nếu contract yêu cầu query param `?sessionKey=...`, implement đúng.
- Nếu contract gắn sessionKey trong path, implement đúng.

**`services/cartApi.ts`**
- `getCart(sessionKey)` → `GET /api/v1/cart` (hoặc path theo contract)
- `addItem(sessionKey, payload)` → `POST /api/v1/cart/items`
- `updateItem(sessionKey, id, payload)` → `PATCH /api/v1/cart/items/:id`
- `removeItem(sessionKey, id)` → `DELETE /api/v1/cart/items/:id`
- Payload phải có `itemId`, `qty`, `note?`, `optionsHash?` đúng schema (contract-first).

**`hooks/useCartQuery.ts`**
- `useCartQuery(sessionKey)` dùng `useAppQuery`
- staleTime 0–10s (cart nên fresh)
- query key: ưu tiên `@hadilao/contracts` qk nếu có; nếu không, tạo `cartQueryKey(sessionKey)` (trong hook), TODO migrate.

**`hooks/useCartMutations.ts`**
- `useAddCartItem(sessionKey)` / `useUpdateCartItem(sessionKey)` / `useRemoveCartItem(sessionKey)`
- invalidate cart query key sau success (hoặc onSettled).
- 409 oversell/hold fail:
  - show Alert ở page (propagate HttpError)
  - auto refetch cart.

### 3.7 Cart page `/c/cart`
**`CustomerCartPage.tsx`**
- Wrap RequireCustomerSession.
- Load sessionKey from store selector.
- Call `useCartQuery(sessionKey)`
- States:
  - loading → skeleton simple (reuse `Skeleton`/`Card`)
  - empty → `CartEmpty`
  - error → Alert (message + correlationId) + “Thử lại”
  - ready → list `CartItemRow` + `CartSummary`
- `CartItemRow`:
  - name, price, qty controls (+/-), remove button
  - disable controls while pending
- `CartSummary`:
  - subtotal, VAT/service (nếu contract có; nếu không, chỉ subtotal)
  - CTA “Tiếp tục thanh toán” → navigate `/c/checkout` (route chưa implement; chỉ link/stub).

### 3.8 Wire “Thêm” ở MenuCard
Trong `MenuCard.tsx`:
- Lấy sessionKey từ customer session store
- Use `useAddCartItem(sessionKey)`
- On click “Thêm”:
  - call mutate({ itemId, qty: 1, note: "", optionsHash: ... })
- On success:
  - Optional: toast-like inline feedback (không cần library), hoặc đổi text “Đã thêm” 1s.
- Nếu no sessionKey → navigate `/c/qr`.

### 3.9 Navbar badge count (optional nhưng nên có)
Trong `CustomerNavbar.tsx`:
- đọc sessionKey
- call `useCartQuery(sessionKey)` với `enabled: !!sessionKey` (tránh call khi chưa có session)
- hiển thị badge count `cart.items.length` nếu available

---

## 4) QA / GATES (BẮT BUỘC)

Chạy:
1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`
4) `pnpm -C apps/fe dev` và manual test:
   - `/c/qr` submit → tạo session → redirect `/c/menu`
   - `/c/menu` click “Thêm” → cart count tăng (nếu BE chạy/cart ready)
   - `/c/cart` update/remove hoạt động
   - BE down → error UI rõ + mock menu vẫn chạy (menu có state=mock).

---

## 5) COMMIT MESSAGE

`fe: PR-04 customer session bootstrap + cart flow (/c/*)`

---

## 6) STOP RULE (KHÔNG ĐƯỢC ĐOÁN)

Nếu contract không rõ:
- payload `sessions/open` hoặc cart session scoping,
- **dừng** và thêm TODO + fallback UI (disable mutate) + error message.  
Không tự đặt header/query param bừa.

