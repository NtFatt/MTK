# DEMO_SCRIPT.md — PR21 Final Demo Pack

Mục tiêu của demo pack này là:

- ngắn
- ít rủi ro
- dễ lặp lại
- không phụ thuộc quá nhiều vào trí nhớ của người demo

Demo nên theo thứ tự dưới đây. Không nhảy lung tung giữa các role nếu không cần.

---

## 1) Pre-demo reset

### 1.1 Chế độ strict (khuyến nghị trước khi chấm)
```powershell
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
pnpm -C packages/contracts build
pnpm -C apps/api typecheck
pnpm -C apps/api build
pnpm -C apps/fe lint
pnpm -C apps/fe typecheck
pnpm -C apps/fe build
```

Sau đó mở 2 terminal chạy app:

```powershell
pnpm -C apps/api dev
pnpm -C apps/fe dev
```

Rồi chạy smoke:

```powershell
pnpm -C apps/api smoke:full
pnpm -C apps/api smoke:negative
pnpm -C apps/api smoke:realtime
pnpm -C apps/api smoke:oversell
```

### 1.2 Chế độ presentation (ngay trước lúc demo)
```powershell
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
pnpm -C packages/contracts build
pnpm -C apps/api dev
pnpm -C apps/fe dev
```

---

## 2) Quick URLs

### Public / customer
- `http://localhost:5173/c/qr`
- `http://localhost:5173/c/menu`
- `http://localhost:5173/c/cart`
- `http://localhost:5173/c/checkout`

### Internal
- `http://localhost:5173/i/login`
- `http://localhost:5173/i/1/tables`
- `http://localhost:5173/i/1/kitchen`
- `http://localhost:5173/i/1/cashier`
- `http://localhost:5173/i/1/reservations`
- `http://localhost:5173/i/1/inventory/stock`
- `http://localhost:5173/i/1/admin/dashboard`
- `http://localhost:5173/i/1/admin/maintenance`
- `http://localhost:5173/i/1/admin/observability`
- `http://localhost:5173/i/1/admin/realtime`

---

## 3) Accounts dùng trong demo

- `staff01 / 123456`
- `kitchen01 / 123456`
- `cashier01 / 123456`
- `bm01 / 123456`
- `admin / admin123`

---

## 4) Demo order chuẩn

### Demo A — Customer flow (bắt buộc)

**Role:** Customer  
**Route bắt đầu:** `/c/qr`  
**Precondition:** Local vừa reset hoặc ít nhất table `A01` còn sạch  
**Action:**

1. Mở `http://localhost:5173/c/qr`
2. Nhập:
   - `branchId = 1`
   - `tableCode = A01`
3. Bấm mở bàn
4. Vào `/c/menu`
5. Thêm 1–2 món bất kỳ
6. Mở `/c/cart`
7. Kiểm tra giỏ hàng
8. Mở `/c/checkout`
9. Tạo order
10. Ghi lại `orderCode`
11. Mở `/c/orders/:orderCode`

**Expected result:**
- session mở được
- menu tải được
- add cart hoạt động
- checkout tạo order thành công
- order status page mở được

**Fallback nếu lỗi nhẹ:**
- nếu QR/camera không dùng được, luôn dùng manual input `branchId=1`, `tableCode=A01`
- nếu `A01` bị bẩn, chuyển sang `A02`
- nếu customer flow kẹt do state cũ, dừng demo và reset local state trước khi cố tiếp

---

### Demo B — Internal tables / staff view

**Role:** STAFF (`staff01 / 123456`)  
**Route:** `/i/login` rồi vào `/i/1/tables`  
**Precondition:** Đã có session/order từ Demo A  
**Action:**

1. Login bằng `staff01 / 123456`
2. Vào tables page
3. Chứng minh bàn branch 1 có dữ liệu tương ứng session vừa mở
4. Nếu UI hỗ trợ, mở chi tiết/cart/order summary của bàn

**Expected result:**
- branch-scoped tables load ổn
- không thấy dữ liệu branch ngoài scope
- session/order đang mở phản ánh được ở tables page

**Fallback nếu lỗi nhẹ:**
- refresh page 1 lần
- nếu branch route sai, quay về `/i/1/tables`

---

### Demo C — Kitchen queue

**Role:** KITCHEN (`kitchen01 / 123456`)  
**Route:** `/i/1/kitchen`  
**Precondition:** Có order mới từ Demo A  
**Action:**

1. Login `kitchen01 / 123456`
2. Mở kitchen queue
3. Chọn order vừa tạo
4. Chuyển trạng thái hợp lệ theo flow bếp, ưu tiên đến `READY`

**Expected result:**
- queue nhìn thấy order của branch 1
- đổi trạng thái hợp lệ được
- order không thể nhảy bừa sang trạng thái sai logic

**Fallback nếu lỗi nhẹ:**
- refresh kitchen page
- nếu order chưa hiện ngay, chờ ngắn hoặc re-open queue
- nếu demo realtime không lên tức thì, vẫn có thể chứng minh bằng reload/refetch

---

### Demo D — Cashier settle cash

**Role:** CASHIER (`cashier01 / 123456`)  
**Route:** `/i/1/cashier`  
**Precondition:** Order từ Demo A đã qua xử lý bếp và còn unpaid  
**Action:**

1. Login `cashier01 / 123456`
2. Mở unpaid list
3. Chọn order vừa tạo
4. Settle cash

**Expected result:**
- unpaid list load được
- settle cash thành công
- order không còn nằm trong unpaid list sau khi xử lý xong

**Fallback nếu lỗi nhẹ:**
- reload cashier page
- nếu order chưa hiện, quay lại order status/customer page để xác nhận trạng thái rồi refresh cashier

---

### Demo E — Reservations (internal operational proof)

**Role:** BRANCH_MANAGER (`bm01 / 123456`)  
**Route:** `/i/1/reservations`  
**Precondition:** Cần có ít nhất 1 reservation tồn tại  
**Cách tạo reservation an toàn trước demo:**

Có thể tạo nhanh bằng API trước khi mở page reservations:

```powershell
curl -X POST http://localhost:3001/api/v1/reservations ^
  -H "Content-Type: application/json" ^
  -d "{\"areaName\":\"Zone A\",\"partySize\":4,\"contactName\":\"Demo Reservation\",\"contactPhone\":\"0900000000\",\"note\":\"demo\",\"reservedFrom\":\"2026-03-16T12:00:00+07:00\",\"reservedTo\":\"2026-03-16T13:30:00+07:00\"}"
```

Lấy `reservationCode` từ response nếu cần track.

**Action:**

1. Login `bm01 / 123456`
2. Mở `/i/1/reservations`
3. Lọc danh sách nếu cần
4. Confirm reservation đang `PENDING`
5. Nếu đúng timing/state thì check-in reservation

**Expected result:**
- reservation list load được
- confirm/check-in hoạt động đúng flow
- branch-scoped page không lộ reservation branch khác

**Fallback nếu lỗi nhẹ:**
- nếu không có reservation để thao tác, dừng ở bước chứng minh page/filter/list
- không cố chế demo bằng dữ liệu rác

---

### Demo F — Inventory

**Role:** BRANCH_MANAGER (`bm01 / 123456`)  
**Route:** `/i/1/inventory/stock`, `/i/1/inventory/holds`, `/i/1/inventory/adjustments`  
**Precondition:** Local state sạch  
**Action:**

1. Login `bm01 / 123456`
2. Mở stock page
3. Mở holds page
4. Mở adjustments history
5. Nếu muốn, thực hiện 1 adjustment nhỏ, an toàn

**Expected result:**
- đọc được stock theo branch
- xem được holds
- adjustment/history không vỡ

**Fallback nếu lỗi nhẹ:**
- nếu adjustment nhạy cảm, chỉ demo read-only stock + holds là đủ

---

### Demo G — Admin-only screens

**Role:** ADMIN (`admin / admin123`)  
**Routes:**  
- `/i/1/admin/dashboard`
- `/i/1/admin/staff`
- `/i/1/admin/maintenance`
- `/i/1/admin/observability`
- `/i/1/admin/realtime`

**Action:**

1. Login `admin / admin123`
2. Vào dashboard
3. Mở staff page
4. Mở maintenance
5. Mở observability
6. Mở realtime admin

**Expected result:**
- admin-only routes vào được
- non-admin không có quyền vào các route này
- maintenance / observability / realtime page load được

**Fallback nếu lỗi nhẹ:**
- nếu metrics/log panel phụ thuộc env mà chưa bật, nói rõ đây là env-gated behavior chứ không fake
- nếu realtime admin không có event mới, vẫn có thể chứng minh page/permission/room wiring

---

## 5) Demo cut version (khi thiếu thời gian)

Nếu chỉ có ít phút, chạy theo thứ tự rút gọn:

1. Customer `/c/qr` → `/c/menu` → `/c/cart` → `/c/checkout`
2. Kitchen `/i/1/kitchen`
3. Cashier `/i/1/cashier`
4. Admin `/i/1/admin/observability` + `/i/1/admin/realtime`

Đừng cố nhồi quá nhiều route nếu thời gian ngắn.

---

## 6) What not to do during demo

- không thêm feature mới ngay trước giờ demo
- không đổi account mặc định
- không dùng table đang bẩn
- không mở cùng lúc quá nhiều tab role khác nhau nếu chưa reset session
- không ngẫu hứng chọn flow lạ ngoài script này

---

## 7) Final note

Demo pack này ưu tiên:

- flow thật
- route thật
- account thật
- fallback rõ

Không cố “trình diễn” thứ chưa polished. Thà demo ít mà chắc còn hơn mở scope và tự làm demo vỡ.
