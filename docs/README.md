# Docs index (Hadilao FE Monorepo)

- [BE_SPEC.md](../BE_SPEC.md) — contract summary để “neo” Cursor/FE vào endpoint thật.
- [CONTRACT_RULES.md](../CONTRACT_RULES.md) — guardrails (contract lock, idempotency, error mapping, realtime).
- [RBAC_MATRIX.md](../RBAC_MATRIX.md) — 7 roles → permissions → pages/actions.
- [API_ROUTE_MAP.generated.md](./API_ROUTE_MAP.generated.md) — route map generate từ code hiện tại.
- [final/PROJECT_SNAPSHOT_SPEC.md](./final/PROJECT_SNAPSHOT_SPEC.md) — snapshot spec tong hop cua toan bo du an hien tai.
- [final/SOURCE_OF_TRUTH.md](./final/SOURCE_OF_TRUTH.md) — điểm commit thật của hold / order / inventory / sellable stock.
- [final/FINAL_HANDOVER.md](./final/FINAL_HANDOVER.md) — handover trung thực sau đợt hardening.
- [../apps/api/docs/RUNBOOK.md](../apps/api/docs/RUNBOOK.md) — local bootstrap, reset, release-check, smoke discipline.

## Context Injection (code-level)

- [`packages/contracts`](../packages/contracts) — nơi chứa **queryKeys**, **error codes/normalizer**, **Zod schemas skeleton**.
  - Mục tiêu: Cursor/FE **không hardcode**, không xử lý lỗi rải rác, và có “khung” schema để siết dần theo OpenAPI.

> Tip: Trong Cursor, pin 3 file này vào “Context” trước khi code.
