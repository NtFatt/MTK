# SOURCE_OF_TRUTH.md -- Inventory, Hold, Order Commit, Sellable Stock

_Date:_ 2026-03-20

---

## 1) Why this doc exists

Truoc dot hardening nay, repo co van de lon:

- cart hold o mot noi
- menu item stock tru o mot moc
- ingredient inventory tru o moc khac

Ket qua la customer mua thanh cong nhung inventory nguyen lieu chua giam ngay, lam UI va nghiep vu lech nhau.

Tai lieu nay chot lai source of truth hien tai theo dung code.

---

## 2) Domain source of truth table

| Domain question | Source of truth hien tai | Khi nao thay doi |
|---|---|---|
| Customer dang giu cho tam thoi bao nhieu? | Redis stock hold | Cart `+ / -`, remove item, abandon cart |
| Order da commit chua? | `orders` + `order_items` trong MySQL | `CreateOrderFromCart` thanh cong |
| Ingredient inventory con bao nhieu? | `inventory_items.current_qty` | Order commit, inventory adjust, cancel restock |
| Consumption ledger la gi? | `inventory_consumptions` | Order commit, cancel restock marker update |
| Sellable/menu stock hien tai la gi? | `menu_item_stock.quantity` + projection refresh | Hold, checkout commit, cancel restock, inventory adjust |
| Public menu dang hien "con lai" bao nhieu? | Menu API + projection/refetch | Public-safe branch realtime, session-scoped realtime invalidation, polling fallback |

---

## 3) Commit points

### 3.1 Cart `+ / -`
- FE goi `PUT /carts/:cartKey/items` hoac `DELETE /carts/:cartKey/items/:itemId`
- Backend tao/release hold
- **Khong tru ingredient inventory that**

### 3.2 Create order from cart
- day la **diem commit kho chinh**
- backend:
  - lock cart
  - create order
  - insert order items
  - decrement menu sellable stock
  - consume ingredient inventory ngay
  - ghi `inventory_consumptions`
  - consume hold
  - mark cart checked out
  - recompute / sync sellable stock

### 3.3 `PREPARING`
- chi con la state nghiep vu
- voi order moi da consume tai `ORDER_CREATED`, nhanh nay se khong tru kho lan hai
- van con legacy-safe no-op de support order cu neu co

### 3.4 Cancel
- cancel tai `NEW` hoac `RECEIVED`:
  - restock ingredient inventory
  - mark consumption trigger thanh `ORDER_CREATED_RESTOCKED`
  - recompute / sync sellable stock
- cancel sau `PREPARING`:
  - hien tai **khong auto restock**

---

## 4) What each UI should mean

### Customer menu
- phan "Con lai" = sellable / public ordering availability
- khong phai raw ingredient qty
- uu tien public-safe branch realtime cho inventory/menu; van co polling fallback de tranh drift khi gap replay gap hay reconnect edge case

### Customer cart
- phan so luong trong cart = hold da dat cho session/cart do

### Internal holds
- cho thay Redis hold dang giu cho tam thoi
- day la tang visibility de giai thich tai sao DB qty va available qty khac nhau

### Internal stock page
- `DB qty`: projection luu trong MySQL
- `Reserved`: phan dang bi giu boi hold
- `Available`: phan con the ban duoc

### Recipe / inventory pages
- recipe readiness + ingredient inventory moi la co so de tinh sellable
- khong duoc doc chung nhu "customer vua mua xong thi ingredient se doi o PREPARING"

---

## 5) Idempotency / anti-double-effect rules

Nhung flow phai duoc hieu nhu "at most once" ve effect nghiep vu:

- create order from cart
- settle cash
- mock payment success
- payment success duplicate / retry

Muc tieu:

- khong double-create order
- khong double-consume hold
- khong double-deduct ingredient inventory
- khong double-settle payment

---

## 6) Known limits tied to this model

- Public branch realtime da dong theo model public-safe cho inventory/menu, nhung van chua full-spec enterprise; customer menu van co polling fallback.
- Branch `999` trong smoke/negative da duoc chot la branch isolation fixture, khong phai branch van hanh day du.
- Neu business doi commit point thanh `payment success` thay vi `order created`, can doi lai transaction boundary va compensation rule.

---

## 7) Bottom line

Neu can nho duy nhat mot cau:

> Cart `+ / -` chi la hold tam thoi; `CreateOrderFromCart` moi la moc commit order + ingredient inventory + sellable stock; `PREPARING` khong con la diem tru kho chinh.
