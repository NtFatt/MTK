# CHANGELOG – P1 (Redis cache + canonical migrations)

Ngày: 2026-02-07

## 1) Migrations / Canonical schema
- **Canonical `scripts/full_schema.sql`**: bỏ unique legacy `uq_cart_item(cart_id,item_id)`, giữ **unique variant** `uq_cart_item_variant(cart_id,item_id,options_hash)` + thêm index hỗ trợ `idx_ci_cart_item(cart_id,item_id)`.
- **Migration 007** `007_p1_cart_item_variant_true.sql`:
  - Ensure column `options_hash` tồn tại.
  - Drop unique `uq_cart_item` nếu DB cũ còn.
  - Ensure unique `uq_cart_item_variant` tồn tại.
  - Ensure index `idx_ci_cart_item` tồn tại.
- **Migration 008** `008_p1_align_stock_tables_to_canonical.sql`:
  - Nếu DB cũ có `stock_holds` dạng legacy (cart_id/stock_date/options_hash) -> drop & recreate theo canonical.
  - Nếu DB cũ có `menu_item_stock.stock_date` -> rebuild table theo canonical + migrate best-effort quantity (lấy record mới nhất, qty_total-qty_sold) rồi drop bảng legacy.

## 2) Redis menu cache (Phase 1)
- Thêm wrapper **`CachedMenuCatalogRepository`** cache các read API:
  - `listCategories`, `listItems`, `getItemById`, `getMeatProfile`, `getComboDetailByItemId`
- Cache key có version: `menu:v{ver}:...` (key `menu:ver`).
- TTL cấu hình qua env:
  - `MENU_CACHE_ENABLED` (default: true)
  - `MENU_CACHE_TTL_SECONDS` (default: 600)
- Wire DI: nếu có `REDIS_URL` + `MENU_CACHE_ENABLED=true` -> tự động bật cache.

## 3) Notes
- Repo export nên **không include `node_modules`** và nên commit **`pnpm-lock.yaml`** trong monorepo gốc. Bản export hiện chỉ cleanup các artefact, còn lock cần generate ở môi trường dev có pnpm.

## 4) Inventory atomic holds (Redis Lua) – Checkout/Hold end-to-end
Ngày cập nhật: 2026-02-09

- **Redis Lua atomic holds** cho Cart (variant thật):
  - `stock:{branchId}:{itemId}` = **available** (db_qty - reserved)
  - `reserved:{branchId}:{itemId}` = tổng đang hold
  - `hold:{cartKey}:{branchId}:{itemId}:{optionsHash}:{noteHash}` = qty giữ chỗ
  - `holds:{cartKey}` = set các holdKey của cart
  - `holdidx` = zset (score = expireAtMs) để cleanup/GC
- **Hold key TTL hardening**: holdKey được cấu hình **sống lâu hơn logical TTL** (mặc định +24h) để tránh tình huống key hết hạn trước khi cleanup chạy → gây drift reserved/stock.
- **Cleanup expired holds (enterprise-safe)**:
  - Nếu cart đã `CHECKED_OUT` nhưng consumeCart fail (Redis down) → cleanup sẽ **CONSUME** (chỉ giảm reserved) thay vì RELEASE (không hoàn stock).
  - Nếu cart chưa checkout → cleanup **RELEASE** hoàn stock bình thường.

