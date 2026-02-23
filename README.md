# Hadilao Online (Monorepo)

Repo dạng `pnpm workspace`.

## Cấu trúc
- `apps/api`: Backend Node.js (Express + TS) theo Clean Architecture.

## Quickstart (Local)
```bash
pnpm -v
pnpm -C apps/api install
cp apps/api/.env.example apps/api/.env
# chỉnh DB/Redis trong .env
pnpm -C apps/api db:reset --yes
pnpm -C apps/api dev
```

## Smoke test (Postman)
```bash
pnpm -C apps/api smoke
```

Ghi chú:
- Không commit `.env` và `node_modules`.
- `db:reset` mặc định **restock demo stock** để smoke chạy ổn; tắt bằng `--no-restock` hoặc `DB_RESET_RESTOCK=false`.
