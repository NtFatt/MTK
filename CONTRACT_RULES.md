# CONTRACT_RULES.md — FE/Client Contract Guardrails (Hadilao Online)

> File này là **luật chơi**: Cursor/FE phải tuân thủ tuyệt đối.  
> Mục tiêu: **Contract Lock**, **RBAC đúng**, **branch isolation**, **idempotency đúng chỗ**, **UX lỗi nhất quán**.

---

## 1) Contract Lock (bất khả xâm phạm)

- **CHỈ** gọi endpoint dưới **`/api/v1/*`**.
- **KHÔNG** tự tạo endpoint mới, không “đoán” path, không hardcode `/api/v1` rải rác.
- Khi `LEGACY_API_ENABLED=false`: **mọi** request `/api/*` phải **404** → FE không được phụ thuộc “API bóng”.

**Chuẩn FE:** `VITE_API_BASE=/api/v1` → client dùng baseURL này.

---

## 2) Auth rules (PUBLIC / CLIENT / INTERNAL)

### 2.1 CLIENT (OTP)
- OTP endpoints (theo route map hiện hành):  
  - `POST /api/v1/client/otp/request` (rate-limited)  
  - `POST /api/v1/client/otp/verify` → trả `accessToken/refreshToken`
- Refresh:
  - `POST /api/v1/client/refresh` (refresh rotation)
- Logout:
  - `POST /api/v1/client/logout`

**Header chuẩn:**
- `Authorization: Bearer <accessToken>` cho endpoint cần CLIENT auth.

### 2.2 INTERNAL (Admin/Staff/Kitchen/Cashier/Manager)
- Login:
  - `POST /api/v1/admin/login` (rate-limited) → trả token + role + permissions
- Header:
  - `Authorization: Bearer <internalToken>`
- Fallback (nếu bật): `x-admin-api-key: <key>` (chỉ dùng khi backend cấu hình)

---

## 3) Branch isolation (nguyên tắc “không rò dữ liệu”)

- **Branch scope là bắt buộc** cho mọi thao tác internal.  
- FE **không được** “tự do truyền branchId” để vượt phạm vi.  
- Branch context phải đến từ:
  - **JWT claims / user profile** (internal roles), hoặc
  - **sessionKey/cartKey** (client theo bàn)

**Killer negative case:** `NEG-03 Branch mismatch` (staff/manager không được chạm dữ liệu branch khác).

---

## 4) Idempotency (opt-in, chỉ cho operation nhạy cảm)

### 4.1 Header chuẩn
- `Idempotency-Key: <uuid-v4>`

### 4.2 Endpoint bắt buộc idempotency (theo SPEC v7 env note)
- `POST /api/v1/admin/payments/mock-success/:orderCode`
- `POST /api/v1/admin/cashier/settle-cash/:orderCode`

**Khuyến nghị:** status change cũng nên idempotent:
- `POST /api/v1/admin/orders/:orderCode/status` (hoặc route tương đương)

### 4.3 Quy tắc generate key (FE)
- **Không auto** tạo key cho mọi request.
- Key scope theo **operation + orderCode** (vd: `settle_cash:ORD...`)
- Khi retry UI: **reuse cùng key**, không tạo key mới.
- TTL server-side (tham khảo env): `IDEMPOTENCY_TTL_SECONDS=600`.

---

## 5) Rate limit

Rate limit dùng Redis counters (key pattern kiểu `rl:{scope}:...`).

Các endpoint nhạy cảm:
- OTP request/verify
- Admin login

**FE handling:** nếu `429` → toast “Thao tác quá nhanh”, dùng backoff (không spam retry).

---

## 6) Error mapping chuẩn (FE UX contract)

| HTTP | Ý nghĩa | FE handling bắt buộc |
|---|---|---|
| 401 | Unauthenticated/expired | Silent refresh → fail thì logout + redirect |
| 403 | Forbidden (RBAC) | Hiện “Không đủ quyền” + disable action |
| 404 | Not found / Contract Lock | Nếu là `/api/*` → lỗi cấu hình; nếu resource → empty state |
| 409 | Conflict (oversell, no table, branch mismatch, trạng thái không hợp lệ) | Dialog + auto refetch cart/order/session |
| 429 | Rate limited | Toast + backoff |
| 5xx | Server error | Error page + “Try again” |

---

## 7) Realtime rules (Socket.IO)

- **Singleton socket manager**: không connect/disconnect theo page mount/unmount.
- **Replay cursor persistence**:
  - key theo `branchId + userId` (internal) hoặc `sessionKey` (client).
- **Event → Query invalidation map** (React Query):
  - `order:*` → invalidate `orders.list`, `orders.detail`
  - `kitchen:*` → invalidate `kitchen.queue`
  - `inventory:*` → invalidate `menu.items` (nếu ảnh hưởng menu)

---

## 8) “Không được làm” (Cursor guardrails)

- Không nhét business logic vào component UI.
- Không tạo endpoint/DTO giả.
- Không bypass permission bằng ẩn UI đơn thuần — **phải guard route + action**.
- Không cache PWA với auth/payment endpoints.
