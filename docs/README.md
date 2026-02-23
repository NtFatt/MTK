# Docs index (Hadilao FE Monorepo)

- [BE_SPEC.md](../BE_SPEC.md) — contract summary để “neo” Cursor/FE vào endpoint thật.
- [CONTRACT_RULES.md](../CONTRACT_RULES.md) — guardrails (contract lock, idempotency, error mapping, realtime).
- [RBAC_MATRIX.md](../RBAC_MATRIX.md) — 7 roles → permissions → pages/actions.

## Context Injection (code-level)

- [`packages/contracts`](../packages/contracts) — nơi chứa **queryKeys**, **error codes/normalizer**, **Zod schemas skeleton**.
  - Mục tiêu: Cursor/FE **không hardcode**, không xử lý lỗi rải rác, và có “khung” schema để siết dần theo OpenAPI.

> Tip: Trong Cursor, pin 3 file này vào “Context” trước khi code.
