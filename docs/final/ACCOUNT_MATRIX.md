# ACCOUNT_MATRIX.md — PR21 Final

Tài liệu này gom toàn bộ account/demo assumptions cần để:

- chạy local
- login đúng role
- không phải nhớ trong đầu
- recreate được nếu DB reset hoặc account bị đổi

---

## 1) Internal demo accounts

> Khuyến nghị luôn chạy lại `pnpm -C apps/api seed:internal` sau `db:reset --yes`.

| Role | Username | Password | Branch scope | Primary routes | How to recreate | Notes |
|---|---|---:|---|---|---|---|
| ADMIN | `admin` | `admin123` | Global | `/i/1/admin/dashboard`, `/i/1/admin/staff`, `/i/1/admin/maintenance`, `/i/1/admin/observability`, `/i/1/admin/realtime` | `pnpm -C apps/api admin:create admin admin123 "System Admin"` hoặc `seed:internal` | ADMIN có full quyền |
| BRANCH_MANAGER | `bm01` | `123456` | Branch `1` | `/i/1/inventory/stock`, `/i/1/reservations`, `/i/1/cashier`, `/i/1/kitchen`, `/i/1/tables` | `pnpm -C apps/api staff:create bm01 123456 BRANCH_MANAGER 1 "Branch Manager 01"` hoặc `seed:internal` | Dùng để demo branch-scoped manager flow |
| STAFF | `staff01` | `123456` | Branch `1` | `/i/1/tables`, `/i/1/reservations` | `pnpm -C apps/api staff:create staff01 123456 STAFF 1 "Staff 01"` hoặc `seed:internal` | Dùng cho tables/session/cart/order ops |
| KITCHEN | `kitchen01` | `123456` | Branch `1` | `/i/1/kitchen` | `pnpm -C apps/api staff:create kitchen01 123456 KITCHEN 1 "Kitchen 01"` hoặc `seed:internal` | Chỉ nên dùng để demo queue + status change hợp lệ |
| CASHIER | `cashier01` | `123456` | Branch `1` | `/i/1/cashier` | `pnpm -C apps/api staff:create cashier01 123456 CASHIER 1 "Cashier 01"` hoặc `seed:internal` | Demo unpaid list + settle cash |
| Cross-branch negative test | custom | custom | Branch `999` | API negative / branch mismatch only | `pnpm -C apps/api staff:create demo999 123456 STAFF 999 "Demo 999"` | Không dùng cho main demo; chỉ dùng nếu muốn chứng minh branch isolation |

---

## 2) Customer / public demo assumptions

Customer FE hiện không phụ thuộc vào internal login để chạy main flow.

### Main customer demo path
- Route vào: `/c/qr`
- Manual input an toàn:
  - `branchId=1`
  - `tableCode=A01`

Sau khi mở session thành công, customer có thể đi tiếp:

- `/c/menu`
- `/c/cart`
- `/c/checkout`
- `/c/orders/:orderCode`
- `/c/payment/:orderCode` nếu muốn đi tiếp sang payment flow

### Customer OTP note
API vẫn có contract cho OTP client:

- `POST /api/v1/client/otp/request`
- `POST /api/v1/client/otp/verify`
- `POST /api/v1/client/refresh`
- `POST /api/v1/client/logout`

Nếu local giữ default trong `.env`:

- `DEV_OTP_ECHO_ENABLED=true`
- `DEV_OTP_FIXED_CODE=123456`

thì OTP dev fixed code là:

- `123456`

Nhưng cần ghi rõ: **main FE customer demo hiện không bắt buộc đi qua OTP** để hoàn thành session/menu/cart/checkout flow.

---

## 3) Demo baseline data sau `db:reset --yes`

| Domain | Baseline |
|---|---|
| Main branch | `branch_id=1`, code `HCM1` |
| Secondary branch | `branch_id=999`, code `HCM999` |
| Main demo tables | `A01`, `A02`, `B01` |
| Cross-branch tables | `Z01`, `Z02` |
| Demo client phone in seed | `0900000000` |

---

## 4) Recommended role usage by scenario

| Scenario | Account nên dùng |
|---|---|
| Customer session / menu / cart / checkout | Không cần internal account |
| Internal tables / ops | `staff01 / 123456` |
| Kitchen queue / status | `kitchen01 / 123456` |
| Cashier settle cash | `cashier01 / 123456` |
| Inventory / reservations / broader branch flow | `bm01 / 123456` |
| Maintenance / observability / realtime admin / staff management | `admin / admin123` |

---

## 5) Recreate checklist sau khi reset DB

Chạy lần lượt:

```powershell
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal
```

Nếu cần recreate thủ công:

```powershell
pnpm -C apps/api admin:create admin admin123 "System Admin"
pnpm -C apps/api staff:create bm01 123456 BRANCH_MANAGER 1 "Branch Manager 01"
pnpm -C apps/api staff:create staff01 123456 STAFF 1 "Staff 01"
pnpm -C apps/api staff:create kitchen01 123456 KITCHEN 1 "Kitchen 01"
pnpm -C apps/api staff:create cashier01 123456 CASHIER 1 "Cashier 01"
```

---

## 6) Rules để tránh tự phá demo

- Không đổi branch của các account mặc định nếu đang dùng demo script chuẩn
- Không dùng table `A01` cho quá nhiều lần demo nối tiếp mà không reset hoặc đóng session
- Không dùng cross-branch account cho main demo
- Không giả định customer OTP là bắt buộc trong flow FE hiện tại
- Không quên rằng admin route chuẩn nằm dưới `/i/1/admin/*`
