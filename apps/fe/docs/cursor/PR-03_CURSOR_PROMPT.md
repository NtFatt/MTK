# PR-03 — Internal Login (OTP) + Auth Session + RBAC Guards + Route namespace /i (Cursor Prompt)

> **Repo:** `hadilao-online` (pnpm workspace)  
> **Scope PR:** chỉ thay đổi trong `apps/fe/**`  
> **Hiện trạng:** PR-00 + PR-01 + PR-02 đã pass. `/customer/menu` đang chạy, menu query đã có data layer.

---

## 0) HARD CONSTRAINTS (KHÔNG ĐƯỢC VI PHẠM)

1) **Không dùng Next APIs**.  
2) **Không đoán contract**: endpoint/DTO phải bám **FE Spec v2** + `@hadilao/contracts` + docs trong repo.  
3) **Contract Lock**: chỉ gọi `/api/v1/*`.  
4) **Không sửa phá**: `src/lib/apiFetch.ts` (giữ nguyên) — nếu cần Authorization, tạo wrapper mới.  
5) **Zustand chỉ giữ auth/session local**; server-truth dùng React Query.  
6) **DoD phải pass**:
   - `pnpm -C apps/fe lint`
   - `pnpm -C apps/fe typecheck`
   - `pnpm -C apps/fe build`
   - `pnpm -C apps/fe dev`

---

## 1) MỤC TIÊU PR-03 (THEO SPEC V2)

### 1.1 Routes chuẩn internal
- Tạo routes **theo spec**:
  - `/i/login`
  - `/i/logout`
- Giữ tương thích dev:
  - `/internal` → redirect sang `/i/login` (legacy alias, không xoá ngay).
- (Optional) Nếu bạn muốn chuẩn hoá luôn customer path: thêm alias `/c/menu` redirect từ `/customer/menu`. **Không bắt buộc** PR-03, nhưng nếu làm thì làm sạch (redirect-only).

### 1.2 Internal Login (OTP) + session model
Triển khai luồng OTP theo spec:
- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/refresh` (nếu có; implement safe—chỉ gọi khi endpoint tồn tại trong contracts)

AuthSession model (tối thiểu):
- accessToken
- refreshToken? (ưu tiên cookie httpOnly; nếu server trả JSON thì lưu có TTL)
- user { id, fullName? }
- role: PUBLIC|CLIENT|STAFF|KITCHEN|CASHIER|BRANCH_MANAGER|ADMIN
- permissions: string[]
- branchId?
- expiresAt? (epoch ms)

### 1.3 Silent refresh + 401 policy (single-flight)
- Request auth-protected mà bị 401:
  - trigger refresh đúng **1 lần** (single-flight)
  - refresh OK → retry request 1 lần
  - refresh fail → logout + redirect `/i/login` + message rõ
- Không log Authorization / token / OTP.

### 1.4 RBAC guards
- Route guard cho toàn bộ `/i/*` (trừ `/i/login`):
  - requireAuth (có access token/session)
  - (chưa cần check permission cho mọi trang, nhưng phải có plumbing để check action/page sau)
- Action guard helper:
  - `can(permission: string): boolean`
  - `hasAny(permissions: string[]): boolean`
  - Component `<Can perm="xxx">` (render children hoặc null) (optional)

---

## 2) FILE/FOLDER PLAN (PHẢI ĐÚNG PATH)

Tạo/điền các file sau:

### 2.1 Shared auth (Zustand)
```
apps/fe/src/shared/auth/
  types.ts
  storage.ts
  authStore.ts
  guards.tsx
  authApi.ts
  token.ts
```

### 2.2 Shared http (authed wrapper + refresh single-flight)
```
apps/fe/src/shared/http/
  authedFetch.ts
  refreshSingleFlight.ts
```

> PR-02 đã có `src/shared/http/*` (errors/normalize/useAppQuery/useAppMutation). PR-03 chỉ bổ sung file mới + dùng lại normalize.

### 2.3 Internal auth feature (UI page)
```
apps/fe/src/features/internal/auth/
  pages/InternalLoginPage.tsx
  components/OtpRequestForm.tsx
  components/OtpVerifyForm.tsx
```

### 2.4 Shared UI primitives (chỉ bổ sung tối thiểu cho login)
```
apps/fe/src/shared/ui/
  input.tsx
  label.tsx
  alert.tsx   (optional nhưng khuyến nghị để render error box đẹp)
```

---

## 3) IMPLEMENTATION DETAILS (BẮT BUỘC)

### 3.1 `shared/auth/types.ts`
Định nghĩa:
```ts
export type Role = "PUBLIC" | "CLIENT" | "STAFF" | "KITCHEN" | "CASHIER" | "BRANCH_MANAGER" | "ADMIN";

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; fullName?: string };
  role: Role;
  permissions: string[];
  branchId?: number | string;
  expiresAt?: number;
};
```

### 3.2 Token storage strategy (SPEC)
- Ưu tiên: refresh token ở cookie httpOnly → FE chỉ giữ accessToken in-memory.
- Nếu server trả `refreshToken` trong JSON (demo):
  - lưu trong **sessionStorage** (ưu tiên) hoặc localStorage
  - có TTL (expiresAt) — hydrate phải tự clear nếu expired.

**`storage.ts`**
- Keys: `hadilao.access`, `hadilao.refresh`, `hadilao.session` (tuỳ bạn) nhưng phải nhất quán.
- Helpers:
  - `loadSession(): AuthSession | null`
  - `saveSession(session: AuthSession): void`
  - `clearSession(): void`
- Tuyệt đối không log.

### 3.3 `authStore.ts` (Zustand)
State tối thiểu:
- `session: AuthSession | null`
- `isHydrated: boolean`
Actions:
- `hydrate()` (load từ storage → set state → isHydrated=true)
- `setSession(session)` (save storage theo policy)
- `logout()` (clear storage + reset state)

Selectors/helpers:
- `isAuthed` boolean
- `role`, `permissions`, `branchId`

### 3.4 `shared/auth/token.ts`
- `getAccessToken(): string | null` (đọc từ store)
- `setSessionTokens(...)` helper (optional)

> Dùng file này để `authedFetch` lấy token mà không import trực tiếp store vào quá nhiều nơi.

### 3.5 `authApi.ts` (OTP endpoints)
BẮT BUỘC bám spec:
- `requestOtp(payload)` → `POST /api/v1/auth/otp/request`
- `verifyOtp(payload)` → `POST /api/v1/auth/otp/verify`
- `refresh()` (nếu có) → `POST /api/v1/auth/refresh`

Dùng `apiFetch` hiện có. **Không** thêm client mới.

Payload/DTO:
- Ưu tiên import type từ `@hadilao/contracts` (schemas/types). Nếu chưa có type, dùng `unknown`/minimal type nhưng phải để TODO + không bịa field name.
- Khi verify thành công phải trả về đủ dữ liệu để build `AuthSession`. Nếu server không trả `permissions`/`role` ngoài token, bạn được phép decode JWT payload **KHÔNG THÊM DEP**:
  - Viết helper `decodeJwtClaims(accessToken)` base64url → JSON parse.
  - Không fail nếu decode hỏng; fallback require server fields.

### 3.6 Refresh single-flight
**`refreshSingleFlight.ts`**
- Export `refreshOnce(fnRefresh): Promise<AuthSession | null>` hoặc tương tự.
- Đảm bảo nhiều request 401 cùng lúc chỉ gọi refresh **1 lần**.

**`authedFetch.ts`**
- Export `apiFetchAuthed<T>(path, options)`:
  - attach `Authorization: Bearer <accessToken>` nếu có
  - call `apiFetch`
  - nếu error status 401:
    - chạy refresh single-flight (nếu endpoint refresh available)
    - nếu refresh OK → retry đúng 1 lần (giữ `Idempotency-Key` nếu options có)
    - nếu refresh fail → logout + throw error chuẩn
- Normalize error dùng `normalizeApiError` đã có ở PR-02 (trả HttpError cho UI).

> Không sửa `src/lib/apiFetch.ts`.

### 3.7 Guards
**`guards.tsx`**
- `RequireAuth` component:
  - nếu store chưa hydrate → render loader/skeleton
  - nếu chưa login → `<Navigate to="/i/login" replace />`
  - nếu authed → render children
- `Can` component (optional):
  - props: `perm`, `anyOf`, `children`, `fallback`
  - check bằng store.permissions

### 3.8 Internal login UI
**Route**: `/i/login` render `InternalLoginPage`.

Page behavior:
- 2 bước:
  1) Request OTP: nhập “username/phone” (tên field tuỳ contract, nếu chưa rõ thì label chung “Số điện thoại / Username”, payload field để TODO).
  2) Verify OTP: nhập OTP, submit verify.
- Handle errors:
  - 401 invalid OTP → message rõ
  - 429 rate limit → show message + disable submit theo `retryAfter` nếu server trả (nếu không, disable 30s)
- After verify success:
  - `authStore.setSession(session)`
  - redirect:
    - nếu có `branchId` → `/i/{branchId}/tables` (theo spec routes)
    - nếu không có branchId → `/i/admin/system` hoặc `/i/login` với message “missing branch scope” (tuỳ role; tối thiểu phải tránh crash)

**`/i/logout`**
- Một page/route action: gọi `authStore.logout()` + clear react-query cache + redirect `/i/login`.
- Clear query cache: dùng `useQueryClient().clear()` trong component route.

---

## 4) UPDATE ROUTER (BẮT BUỘC)

Cập nhật `apps/fe/src/app/router.tsx`:
- Add routes:
  - `/i/login` → `InternalLoginPage`
  - `/i/logout` → `InternalLogoutPage` (có thể nằm cùng folder internal/auth/pages)
  - `/i/:branchId/tables` → tạm placeholder page `InternalTablesStubPage` (simple) **bọc RequireAuth**
- Legacy alias:
  - `/internal` → redirect `/i/login`
- Không phá `/customer/menu` hiện có.

> PR-03 chỉ cần stub `/i/:branchId/tables` để chứng minh guard + branch param hoạt động.

---

## 5) QA / GATES (BẮT BUỘC)

Chạy:
1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`
4) `pnpm -C apps/fe dev` và test:
   - `/i/login` render OK
   - Verify flow (nếu BE chạy) → redirect `/i/:branchId/tables`
   - `/i/logout` clear session → về `/i/login`
   - Nếu BE không chạy: UI phải hiện lỗi gọn (Alert) + không trắng màn hình

---

## 6) COMMIT MESSAGE

`fe: PR-03 internal otp login + auth session + rbac guards`

---

## 7) STOP RULE

Nếu bạn không tìm thấy DTO/field cho OTP request/verify trong contracts, **đừng bịa**.  
Giải pháp:
- implement UI + plumbing + services với TODO rõ ràng,
- payload type dùng `unknown` hoặc minimal `{ identifier: string }` nhưng phải được comment “confirm contract field name”.

