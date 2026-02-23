# CHANGELOG – P1.1 (DI + SocketGateway rooms + migration 009)

Ngày: 2026-02-08

## 1) Realtime – SocketGateway (đúng spec v4)
- **Rooms bổ sung/chuẩn hoá**:
  - `session:{sessionId}`
  - `sessionKey:{sessionKey}` (optional)
  - `order:{orderId}`
  - `branch:{branchId}` (admin-only)
  - `admin` (admin-only)
- **Join policy (enterprise-safe)**
  - Client join `order:{orderId}` cần `sessionKey` (hoặc `sessionId`) + backend verify **order thuộc session**.
  - Admin join `admin`/`branch:{branchId}`/`order:{orderId}` bằng `adminToken` (HMAC signed) theo `ADMIN_TOKEN_SECRET`.
- **Broadcast policy**
  - Event bus broadcast theo scope: session / sessionKey / order / branch + stream `admin`.

## 2) Cart variants – align schema `uq_cart_item_variant(cart_id,item_id,options_hash)`
- `cart_items` upsert/delete đã support **variant thật**:
  - Accept `itemOptions` (JSON) ở `POST /carts/:cartKey/items`.
  - Compute **stable `options_hash` = sha256(canonical-json(itemOptions))**.
  - DELETE `.../items/:itemId?optionsHash=...`:
    - Có `optionsHash` -> xoá đúng variant
    - Không có -> xoá toàn bộ variants của item trong cart
- Order creation từ cart snapshot sang `order_items.item_options`.

## 3) Migration 009 – Seed menu_item_stock baseline
- Thêm `009_p1_seed_menu_item_stock.sql`:
  - Insert IGNORE các dòng missing vào `menu_item_stock` theo matrix **branch (active) × menu_items (active)**.
  - Lấy `quantity` mặc định từ `menu_items.stock_qty` (fallback 0).

## 4) Notes
- Patch này chủ đích để chạy “end-to-end” realtime: **Cart → Order → Payment → Socket events**.
- Phase 1 tiếp theo vẫn là: Redis session store (`sess:*`) + Redis atomic stock holds (Lua/DECR).
