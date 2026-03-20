# KNOWN_ISSUES.md -- Post-PR25 Hardening

Nguyen tac:

- ngan
- that
- co workaround
- khong che giau gioi han ky thuat

---

## A) Product / UX limits

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| K-01 | Public stock visibility chua phai branch-wide realtime full-spec | Admin inventory adjust co the mat mot nhip polling moi phan anh sang customer menu | Giữ customer menu mo tren focus/refetch; polling hien tai da duoc rut ngan |
| K-02 | Public reservation FE chua phai luong polished closeout | Khong nen demo reservation customer flow chi bang FE | Dung public reservation API + internal reservations page |
| K-03 | Mot so copy/error text van uu tien correctness hon wording | UX o edge case chua that "mượt" | Chap nhan o muc local-demo, uu tien dung state va contract |

---

## B) Technical / modeling limits

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| T-01 | Branch `999` hien chu yeu la branch demo/phuc vu branch-isolation test | Negative pack khong tao `orderOther` bang checkout cross-branch that | `smoke:negative` seed fixture order rieng truoc khi chay |
| T-02 | Public customer socket chua co room cong khai an toan cho inventory/menu branch-wide | Khong nen claim public realtime stock full-spec | Dung invalidate + polling fallback nhu hien tai |

---

## C) Local environment constraints

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| E-01 | Repo can MySQL + Redis local de co trai nghiem day du | Thieu service se mat mot so flow hoac realtime behavior | Bat MySQL va Redis truoc khi reset/run |
| E-02 | Dirty local state de gay `NO_TABLE_AVAILABLE` hoac conflict session/reservation | Demo de vo neu chay chong nhieu lan | Chay `pnpm -C apps/api db:reset --yes` va `pnpm -C apps/api seed:internal` |
| E-03 | OTP dev behavior phu thuoc env local | Khong phai may nao cung dang bat fixed code | Kiem tra `DEV_OTP_ECHO_ENABLED` va `DEV_OTP_FIXED_CODE` |

---

## D) Delivery honesty

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| D-01 | Repo nay chua phai production deployment package hoan chinh | Khong nen claim production-ready enterprise deployment | Trinh bay dung la local-demo / handover-safe deliverable |
| D-02 | Mot phan suc manh verification van dua vao smoke/runbook discipline | Neu khong verify truoc demo, nguoi xem co the gap state drift | Bám `README.md`, `apps/api/docs/RUNBOOK.md`, va `pnpm verify:all` |
