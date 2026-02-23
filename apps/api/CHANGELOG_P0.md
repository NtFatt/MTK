# CHANGELOG — P0 Patch (Tuần 1)

**Ngày:** 2026-02-05  
**Mục tiêu:** Chốt *canonical schema* chuẩn + fix drift bằng migration, chuẩn hoá scripts, đóng session & đồng bộ trạng thái bàn theo lifecycle reservation.

---

## 1) Canonical Schema (FULL) + Reset/ Diff

### ✅ Added
- `scripts/full_schema.sql` (DDL only, generated từ `SQL.zip`).
  - Đồng bộ `ck_resv_status` đã bao gồm: `NO_SHOW`, `COMPLETED` (khớp migration P0).
- `scripts/_sql-runner.js` — runner SQL **hỗ trợ DELIMITER** (trigger/procedure) + tránh split naïve.
- `scripts/db-reset.js` — reset DB an toàn (có **flag xác nhận**).
- `scripts/db-diff.js` — kiểm tra drift schema (DB hiện tại) so với `full_schema.sql`
  - Normalize để **bỏ qua AUTO_INCREMENT counter** (thay đổi sau seed), `DEFAULT NULL` implicit, và display width kiểu `int(11)` vs `int`.

### ✅ package.json scripts
- `pnpm db:reset --yes`  
  - Drop & create DB (destructive)  
  - Apply `scripts/full_schema.sql`  
  - Apply `scripts/seed.sql` (mặc định)  
  - Apply `scripts/migrations/*.sql` (mặc định)
- `pnpm db:diff`  
  - Check thiếu bảng / dư bảng / drift DDL

### 🔒 Safety
- `db:reset` từ chối chạy nếu không có `--yes` hoặc `DB_RESET_CONFIRM=YES`.

### ✅ Canonical alignment
- `full_schema.sql`: cập nhật `ck_resv_status` để bao gồm `NO_SHOW`, `COMPLETED` (đồng bộ với domain + migration 002).

---

## 2) Migration Runner chuẩn hoá (DELIMITER-aware)

### ✅ Updated
- `scripts/db-migrate.js`:
  - Dùng `scripts/_sql-runner.js` để split & chạy từng statement.
  - Standard env: ưu tiên `MYSQL_*`, fallback `DB_*`.

### ✅ Migrations (P0)
> **NOTE:** Xoá các migration cũ tạo `table_reservations` (tránh fail khi dùng `full_schema.sql`).

- `scripts/migrations/001_p0_order_totals_triggers.sql`
  - `sp_recalculate_order_totals`
  - Triggers:
    - before insert/update: tính `order_items.line_total`
    - after insert/update/delete: recalc totals cho `orders`
  - Backfill `line_total` + totals cho dữ liệu hiện có.

- `scripts/migrations/002_p0_reservation_status_expand.sql`
  - Mở rộng CHECK constraint `ck_resv_status` thêm: `NO_SHOW`, `COMPLETED`.
  - Drop constraint cũ an toàn bằng prepared statement.

---

## 3) Close Session + Table Status Sync (Reservation Lifecycle)

### ✅ Added API
- `POST /api/v1/sessions/:sessionKey/close`
- Legacy: `POST /api/sessions/:sessionKey/close`

### ✅ Business rules (theo lựa chọn bạn chốt)
- **RESERVED chỉ set khi còn ≤ 30 phút đến giờ đặt** (khuyến nghị, tránh "reserve giả" quá sớm).
- **Cancel có cập nhật lại trạng thái bàn** (lifecycle sạch):
  - Nếu không có reservation CONFIRMED bắt đầu trong 30 phút → `AVAILABLE`.
  - Nếu có → `RESERVED`.
  - Nếu bàn `OCCUPIED`/`OUT_OF_SERVICE` → không động vào.

### ✅ Behavior khi đóng session
- Session: `OPEN` -> `CLOSED` + set `closed_at`.
- Reservation: nếu có reservation `CHECKED_IN` gắn `session_id` -> set `COMPLETED`.
- Table status:
  - nếu `OUT_OF_SERVICE` giữ nguyên
  - else nếu có CONFIRMED start trong 30 phút -> `RESERVED`
  - else -> `AVAILABLE`

---

## 4) Order Items / Totals consistency

### ✅ Updated
- `MySQLOrderItemRepository.bulkInsert`:
  - Insert kèm `line_total` để không lệch DDL (NOT NULL).
  - Totals tự sync bởi triggers/procedure (P0).

---

## 5) Packaging

- Zip patch **đã loại `.env`** để tránh leak config/password.

