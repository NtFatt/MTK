# FINAL_HANDOVER.md -- Hadilao Online After PR25 Rescue

## 1) Executive summary

Hadilao Online hien la monorepo full-stack cho customer ordering + internal restaurant operations voi:

- customer session/menu/cart/checkout/order/payment flow
- internal ops tables/session/order flow
- kitchen queue + cashier flow
- inventory / hold / sellable stock flow
- reservations
- branch isolation + RBAC
- realtime foundation + replay/audit support

Dieu quan trong nhat cua dot hardening nay:

- ingredient inventory commit point da duoc dua ve checkout/order creation
- `PREPARING` khong con la diem tru kho nghiep vu chinh
- visibility giua customer/internal da bot "moi noi mot so"
- smoke/negative verification da duoc siet lai

---

## 2) Architecture summary

### Frontend
- React
- TypeScript
- Vite
- TanStack Query
- Zustand
- React Router
- Socket.IO client

### Backend
- Express
- TypeScript
- MySQL 8
- Redis
- Socket.IO
- layered / clean-architecture style separation

### Shared contract
- `packages/contracts`
- shared query keys / contract helpers / error handling conventions

---

## 3) Current business source of truth

Tom tat:

1. Cart `+ / -`
   - tao/release hold tam thoi trong Redis
   - chua phai ingredient consumption that

2. Create order from cart
   - tao order + order items
   - tru menu sellable stock
   - consume hold
   - tru ingredient inventory ngay
   - ghi `inventory_consumptions`
   - recompute/sync sellable stock

3. `PREPARING`
   - chi con la state nghiep vu
   - co legacy-safe guard de tranh double deduction

4. Cancel o `NEW/RECEIVED`
   - restock ingredient inventory
   - update projection/sellable stock

5. Payment/cashier
   - settle cash / mock success duoc harden de duplicate request khong tao effect lap

Doc chi tiet o:
- [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md)

---

## 4) What is implemented and usable

### Customer/public
- QR/session bootstrap
- menu
- cart
- checkout
- payment page / return page
- order status

### Internal
- admin auth
- tables / ops session flow
- kitchen queue
- cashier unpaid / settle cash
- inventory stock / holds / adjustments
- menu management / recipes
- reservations
- observability / realtime admin

### Runtime guarantees with real value
- branch isolation duoc kiem o backend, khong chi hide UI
- duplicate settle/payment retry co idempotency cover
- oversell co deterministic smoke
- negative pack cover 401/403/404/409/429 + duplicate cases

---

## 5) Verification discipline

Repo hien co the duoc verify theo 2 tang:

### Static / compile
- `pnpm verify:static`

### Runtime
- `pnpm verify:smokes`

Smoke packs khong chi kiem happy path ma con kiem:
- branch mismatch
- forbidden actions
- duplicate settle / duplicate payment success
- oversell
- realtime replay/join sanity

---

## 6) Honest limitations

Nhung diem sau van phai noi that:

- Public customer stock updates chua phai public branch-wide realtime full-spec; van co polling fallback.
- Branch 999 la branch demo/phuc vu branch isolation test; negative pack seed fixture order rieng thay vi checkout cross-branch that.
- Public reservation FE chua phai luong polished closeout.
- Repo van phu thuoc MySQL + Redis local de co trai nghiem day du.

---

## 7) Suggested next work

Neu muon di tiep theo roadmap con lai, thu tu hop ly nhat la:

1. public/internal realtime closure that su
2. reservation/table lifecycle edge-case hardening
3. payment/kitchen/order terminal-state hardening sau commit
4. final docs + cleanup + route map / runbook discipline tiep tuc

---

## 8) Final judgment

Repo hien tai khong con o trang thai "demo roi phat".  
No da co:

- business commit point dung hon
- verification manh hon
- route/action guard chat hon
- handover trung thuc hon

Nhung phai giu mot ket luan ky luat:

> Day la mot local-demo / handover-safe deliverable da duoc harden rat nhieu sau PR25, nhung van khong nen overclaim thanh production-ready closeout toan phan.
