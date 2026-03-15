# MTK Project Strict Status After PR20

## Đã làm được
- contracts build / API build / FE lint-typecheck-build xanh
- API smoke full / negative / realtime / oversell pass
- FE hardening cleanup completed
- permission checks centralized
- internal POS routes normalized to branch-scoped paths
- Tables / Kitchen / Cashier manual verify pass
- Reservations / Maintenance / Observability / Realtime Admin manual verify pass
- duplicate staff username handling fixed from 500 to 409

## Chưa làm được hoàn hảo
- duplicate username FE copy still generic (cosmetic)

## Known issues còn lại
- KI-STAFF-UX-01

## Đánh giá readiness trước PR21
- system is hardening-complete and demo-safe
- remaining work belongs to release readiness, runbook, demo pack, and repo finalization