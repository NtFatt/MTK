# PR-02 — Data layer chuẩn + Nối Menu API thật (Contract-first) — Cursor Prompt (COPY/PASTE)

> **Repo:** `hadilao-online` (pnpm workspace)  
> **Scope PR:** chỉ thay đổi trong `apps/fe/**`  
> **Hiện trạng:** PR-00 + PR-01 đã pass. `/customer/menu` đang chạy UI baseline + mock + `?state=`.

---

## 0) HARD CONSTRAINTS (KHÔNG ĐƯỢC VI PHẠM)

1) **Không phát minh endpoint/field**: mọi API path/DTO phải lấy từ `docs/BE_SPEC.md` và/hoặc OpenAPI trong `packages/contracts` (hoặc exports từ `@hadilao/contracts`). Nếu không tìm thấy → dừng và để TODO rõ + fallback mock (nhưng không đoán).
2) **Contract Lock**: chỉ gọi `/api/v1/*`. Nếu baseURL không chứa `/api/v1` phải fail-fast (giữ logic `apiFetch.ts` hiện có).
3) **Không dùng Next APIs**.
4) **Separation of concerns**: component UI không gọi fetch trực tiếp. Phải tách `services/` + `hooks/`.
5) **Query keys/DTO/error codes**: ưu tiên dùng từ `@hadilao/contracts` hoặc `apps/fe/src/lib/contracts.ts` (không tự bịa key string trong page).
6) **DoD phải pass**:
   - `pnpm -C apps/fe lint`
   - `pnpm -C apps/fe typecheck`
   - `pnpm -C apps/fe build`
   - `pnpm -C apps/fe dev` (mở `/customer/menu` không lỗi)

---

## 1) MỤC TIÊU PR-02

### 1.1 Data layer chuẩn (theo spec)
- Có **normalizeApiError** thống nhất.
- Có wrapper **useAppQuery / useAppMutation** để:
  - normalize lỗi,
  - đặt default retry policy,
  - optional toast policy (tối thiểu: expose error cho UI),
  - chuẩn hoá `staleTime/gcTime` theo domain (menu 5–10 phút).

### 1.2 Nối “Menu” sang API thật (contract-first)
- `/customer/menu` mặc định **ready = gọi API thật** (nếu BE chạy).
- Giữ `?state=skeleton|empty` như override dev.
- Nếu BE không chạy hoặc endpoint không có trong contract → UI hiển thị error state đúng chuẩn (không trắng), và vẫn cho phép chuyển sang mock (dev fallback) **nhưng không đoán contract**.

---

## 2) FILE/FOLDER PLAN (PHẢI ĐÚNG PATH)

Tạo/điền các file sau:

### 2.1 Shared HTTP layer
```
apps/fe/src/shared/http/
  errors.ts
  normalizeApiError.ts
  useAppQuery.ts
  useAppMutation.ts
```

### 2.2 Feature menu: hooks + services
```
apps/fe/src/features/customer/menu/
  hooks/useMenuQuery.ts
  services/menuApi.ts
```

> KHÔNG được nhét logic gọi API vào `CustomerMenuPage.tsx`.

---

## 3) IMPLEMENTATION DETAILS (BẮT BUỘC)

### 3.1 Error model + normalize
**`apps/fe/src/shared/http/errors.ts`**
- Export type:
  ```ts
  export type HttpError = {
    status: number;
    code?: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
  ```
- Có helper type-guard nếu cần: `isHttpError(x): x is HttpError`.

**`normalizeApiError.ts`**
- Nhận `unknown` error (thường từ `apiFetch`) và trả `HttpError`.
- Ưu tiên lấy:
  - `status` (number)
  - `code` (string)
  - `message`
  - `correlationId`/`requestId` nếu BE trả.
- Nếu không parse được → fallback `{ status: 0, message: 'Network error' }`.
- **Không log token/PII**.

### 3.2 Wrappers: useAppQuery / useAppMutation
**`useAppQuery.ts`**
- Wrap `useQuery` của TanStack.
- Nhận `queryKey`, `queryFn`, options.
- Default:
  - `retry`: 0 cho 4xx; 1 cho network/5xx (có thể đơn giản)
  - `refetchOnWindowFocus`: false
- Đảm bảo `error` được normalize bằng `normalizeApiError` (trả về `HttpError`).
- Expose shape: `{ data, isLoading, isError, error: HttpError | null, ... }`.

**`useAppMutation.ts`**
- Wrap `useMutation`.
- Normalize error giống query.
- Hỗ trợ optional `invalidateKeys?: unknown[]` (mảng queryKey) để `queryClient.invalidateQueries({ queryKey })`.
- Mutation phải disable UI khi pending (component dùng `isPending`).

> Nếu bạn muốn đặt default queryClient options, chỉ sửa trong `src/app/providers.tsx` (nhỏ, không refactor lớn).

### 3.3 Menu API: đọc contract trước khi code
**BẮT BUỘC**: mở và đọc trong repo:
- `docs/BE_SPEC.md` (tìm section Menu)
- `packages/contracts/**` (openapi / generated types) hoặc `@hadilao/contracts`
- `apps/fe/src/lib/contracts.ts` (xem nó export gì: qk? schemas? DTO?)

**`menuApi.ts`**
- Implement API calls dựa trên endpoint thật tìm được.
- Tối thiểu cần trả về “menu view model” cho page:
  - categories[]
  - items[]
- Nếu BE tách endpoint:
  - gọi 2 endpoints (categories + items) và combine.
- Tất cả gọi thông qua `apiFetch` hiện có (không tạo fetch mới).

**`useMenuQuery.ts`**
- Export `useMenuQuery(params)` dùng `useAppQuery`.
- Query key phải lấy từ contracts (vd: `qk.menu(...)`). Nếu không có sẵn qk:
  - dùng helper trong `apps/fe/src/lib/contracts.ts` nếu có.
  - nếu hoàn toàn không có, tạo `menuQueryKey(...)` trong **services/hook** (NOT in page), và để TODO “migrate to contracts qk”. (Không đặt string random trong page.)

**Caching policy**
- `staleTime`: 5 phút (hoặc 10 phút) cho menu.
- `gcTime`: >= 30 phút.

### 3.4 Update CustomerMenuPage (tối thiểu)
Trong `CustomerMenuPage.tsx`:
- Giữ `?state=` override như PR-01.
- Mặc định `ready`:
  - gọi `useMenuQuery()`
  - loading → render `MenuSkeleton`
  - empty (no items) → `MenuEmpty`
  - error → render page-level error box (message + correlationId nếu có) + nút “Thử lại” gọi `refetch()`
- Khi error xảy ra, vẫn cho phép dev fallback:
  - thêm 1 link nhỏ “Dùng dữ liệu mẫu” → set searchParams `state=mock` (NEW state)
  - state=mock → render như PR-01 dùng `mockMenu`
  - (Nếu bạn thấy scope quá, có thể bỏ state=mock, chỉ cần error UI chuẩn.)

> Không được xoá states skeleton/empty đã có.

---

## 4) QA / GATES (BẮT BUỘC)

Sau khi implement xong, chạy:
1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`
4) `pnpm -C apps/fe dev`
   - `/customer/menu` (BE chạy → thấy data thật; BE tắt → thấy error UI)
   - `/customer/menu?state=skeleton`
   - `/customer/menu?state=empty`

---

## 5) OUTPUT (WHAT TO COMMIT)

Chỉ commit thay đổi trong `apps/fe/**` theo đúng file plan.  
Commit message gợi ý:
- `fe: PR-02 data layer wrappers + menu query (contract-first)`

---

## 6) IF YOU ARE ABOUT TO GUESS CONTRACT… STOP

Nếu không thấy endpoint/menu DTO trong `docs/BE_SPEC.md` hoặc contracts, **không đoán**.  
Thay vào đó:
- implement data layer chuẩn,
- giữ mock + error UI,
- để TODO rõ ràng “need OpenAPI path/DTO for menu”.
