# FINAL_STATUS.md -- MTK Project After PR25 Rescue And Post-PR25 Hardening

_Date:_ 2026-03-20

---

## 1) Current judgment

Danh gia nghiem tuc:

- Repo khong con o muc "build pass nhung flow lech business".
- Inventory commit point da duoc dua ve dung giao dich ban hang.
- Compile gate va runtime smoke gate hien tai deu xanh.
- Tuy vay, repo van chua nen duoc claim la production-ready hay realtime full-spec closeout.

Ket luan ngan:

- **Trang thai hien tai:** strong local-demo / handover-safe / technically coherent
- **Khong nen claim:** enterprise production closure
- **Da giai quyet duoc 2 blocker lon nhat sau PR25:** inventory commit point va consistency visibility co y nghia

---

## 2) What is actually closed

### 2.1 PR25-R direction
Da chot duoc cac diem co tac dong thuc:

- admin inventory/menu/recipe visibility khong con "ke moi man hinh mot cau chuyen"
- stock page tach ro `DB qty / Reserved / Available`
- customer menu khong con stale 5 phut; da co invalidate/refetch ngan hon
- false message/runtime issue ro rang duoc lam sach de qua lint/build/smoke

### 2.2 PR26 direction
Da chot business rule moi trong code:

- customer checkout tao order thanh cong -> ingredient inventory bi tru ngay
- `inventory_consumptions` duoc ghi tai commit point nay
- `PREPARING` khong con la diem tru kho chinh
- cancel o `NEW/RECEIVED` co restock lai ingredient inventory
- create-order path va cac payment-related duplicate paths da duoc harden idempotency hon truoc

### 2.3 PR27 direction
Da chot mot phan consistency quan trong:

- hold/release/checkout da hien ro hon giua customer menu, cart va internal stock
- admin stock page doc duoc reserved/available thay vi chi nhin so MySQL "mu"
- negative smoke va oversell smoke da cover duoc nhung anti-regression co y nghia

### 2.4 Security / routing hardening
Da sua mot bug route scope thuc su:

- permission middleware o admin menu / admin realtime khong con chan nham cac route `/admin/*` khac
- branch mismatch negative case van duoc giu dung va pass runtime verify

---

## 3) Verified gates

Tai thoi diem cap nhat tai lieu nay, da verify pass:

### Compile / static gates
- `pnpm verify:static`
- `pnpm -C apps/fe lint`
- `pnpm -C apps/fe typecheck`
- `pnpm -C apps/fe build`
- `pnpm -C apps/api typecheck`
- `pnpm -C apps/api build`

### Runtime gates
- `pnpm -C apps/api smoke:full`
- `pnpm -C apps/api smoke:negative`
- `pnpm -C apps/api smoke:realtime`
- `pnpm -C apps/api smoke:oversell`
- `pnpm -C apps/api verify:smokes`

---

## 4) What is still not fully closed

Nhung diem duoi day la that, khong phai "loi noi khiem ton":

- Public/customer stock visibility van dua mot phan vao polling fallback; chua phai public branch-wide realtime full-spec.
- Branch 999 chu yeu dang la branch demo/phuc vu branch-isolation test; negative smoke phai seed fixture order rieng thay vi checkout cross-branch that.
- Public reservation FE flow van chua phai ban polished closeout.
- Repo van la local-demo / handover-safe deliverable; chua phai deployment package day du.

---

## 5) What must not be claimed

Khong nen claim cac dieu sau:

- "Full production-ready realtime"
- "Enterprise deployment ready"
- "All deferred roadmap items are finished"
- "No local-environment dependency"

Claim dung hon:

- **inventory business commit da coherent**
- **core local verification da manh hon rat nhieu**
- **branch isolation / idempotency / oversell / negative cases da duoc harden**
- **handover state dang trung thuc hon va de verify hon**

---

## 6) Bottom line

So voi tinh trang truoc rescue sau PR25, repo da tien mot buoc rat lon:

- khong con lech commit point inventory
- khong con mot so route guard scope sai nguy hiem
- co smoke/negative packs chay on dinh hon
- docs/runbook/verification dang duoc dua ve cung mot cau chuyen voi code

Noi thang:

> Du an hien da du manh de demo va handover nghiem tuc o local, nhung van con mot so deferred scope va gioi han kien truc phai duoc noi ro thay vi overclaim la "closeout toan phan".
