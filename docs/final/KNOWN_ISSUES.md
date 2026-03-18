# KNOWN_ISSUES.md — PR21 Final

Nguyên tắc của file này:

- ngắn
- thật
- có workaround
- không kể khổ

---

## A) Deferred product scope

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| K-01 | Public/customer reservation UI chưa polished thành full FE flow | Không demo được public reservation journey hoàn chỉnh chỉ bằng FE | Dùng public reservation API để tạo reservation, sau đó demo internal reservations page |
| K-02 | Một số copy/error text ở vài path vẫn còn thiên về kỹ thuật | UX chưa thật mượt ở mọi tình huống conflict/edge case | Chấp nhận ở mức local-demo; ưu tiên correctness hơn wording |

---

## B) Local / environment constraints

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| E-01 | Repo cần MySQL + Redis local để có trải nghiệm đầy đủ | Thiếu service sẽ làm một số flow fail hoặc mất realtime behavior | Bật MySQL và Redis trước khi reset/run |
| E-02 | Metrics / observability behavior phụ thuộc env | Có máy sẽ không thấy metrics hoặc bị auth-gated | Kiểm tra `METRICS_ENABLED` và `METRICS_REQUIRE_ADMIN` trong `.env` |
| E-03 | OTP dev behavior phụ thuộc env local | Không phải máy nào cũng đang bật fixed code | Kiểm tra `DEV_OTP_ECHO_ENABLED=true` và `DEV_OTP_FIXED_CODE=123456` nếu cần test OTP API |
| E-04 | Dirty local state có thể gây `NO_TABLE_AVAILABLE` hoặc reservation/session conflict | Demo dễ vỡ nếu chạy chồng nhiều lần | Chạy `pnpm -C apps/api db:reset --yes` rồi `seed:internal` trước demo |

---

## C) Delivery honesty

| ID | Issue | Impact | Workaround |
|---|---|---|---|
| D-01 | Repo này chưa phải production deployment package hoàn chỉnh | Không nên claim production-ready enterprise deployment | Trình bày đúng là local-demo / handover-ready deliverable |
| D-02 | Một phần sức mạnh của demo vẫn phụ thuộc reset discipline | Nếu không reset đúng trước khi demo, người xem có thể gặp state drift | Luôn bám `docs/final/DEMO_SCRIPT.md` và `apps/api/docs/RUNBOOK.md` |
