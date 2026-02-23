# MENU BASELINE + MENU READ API (P1)

## Summary
- **Seed menu “đậm Hadilao hơn”**: ~120 món (broth / thịt / hải sản / viên / rau-nấm / tinh bột / nước / tráng miệng / gia vị), **8 combo** có composition thực tế.
- **Meat Profiles**: thịt chia **cut rõ** (beef/pork/lamb) để FE hiển thị “...tổng quan món thịt” một cách thông minh.
- **Menu Read API** theo Clean Architecture: ports → use-cases → repositories → controller/routes.

## New endpoints
Base: `/api/v1/menu`

1) `GET /categories`
- Query: `activeOnly=true|false` (default: `true`)

2) `GET /items`
- Query:
  - `categoryId` (optional)
  - `q` (optional search)
  - `branchId` (optional, per-branch stock)
  - `onlyInStock=true|false` (optional)
  - `limit` (default 50, max 200)
  - `offset` (default 0)
  - `sort` = `name|price_asc|price_desc|newest` (default: `name`)
  - `activeOnly=true|false` (default: `true`)
- Response: `{ items, total, limit, offset }`

3) `GET /items/:itemId`
- Response: menu item detail + flags `isCombo/isMeat`.

4) `GET /items/:itemId/meat-profile`
- 404 nếu item không có meat profile.

5) `GET /items/:itemId/combo`
- 404 nếu item không phải combo.

## Files changed
- `scripts/seed.sql` (dataset lớn hơn + combo composition + meat_profiles đầy đủ)
- Added domain entities: `MenuCategory`, `MenuItem`, `ComboDetail`, `MeatProfile`
- Added port + use-cases: `IMenuCatalogRepository`, `GetMenuCategories`, `ListMenuItems`, `GetMenuItemDetail`, `GetComboDetail`, `GetMeatProfile`
- Added infra repo: `MySQLMenuCatalogRepository`
- Added HTTP layer: `MenuController`, `menu.route.ts`
- Wired in: `src/main/di.ts`, `src/interface-adapters/http/routes/index.ts`

## How to use
1) Reset DB: `pnpm db:reset --yes`
2) Start dev: `pnpm dev`
3) Test nhanh:
   - `/api/v1/menu/categories`
   - `/api/v1/menu/items?branchId=<branchId>&onlyInStock=true&categoryId=<id>&q=wagyu`
   - `/api/v1/menu/items/<id>`

## Notes
- Khi có `branchId`: `stockQty` đọc từ SoT `menu_item_stock.quantity`.
- Không có `branchId`: fallback `menu_items.stock_qty` để giữ backward-compat.
