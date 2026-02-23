# Hadilao Online – Export Package (2026-02-07)

Mục tiêu gói này: **thay thế chat cũ** bằng một bộ artefact có thể clone/chạy/hand-over ngay.

## 1) Nội dung gói
- Source code (trừ `node_modules`)
- Postman collections + environments: `docs/postman/*`
- Tài liệu handover/spec/luồng dữ liệu: `docs/handover/*`
- Changelog hiện có: `CHANGELOG_P0.md`, `CHANGELOG_MENU_API.md`

## 2) Quick start
> Yêu cầu: Node.js LTS, pnpm, MySQL 8

```bash
pnpm install
pnpm dev
```

Healthcheck:
- `GET /api/v1/health`

Smoke test (nếu có script):
```bash
pnpm smoke
```

## 3) DB
- Canonical schema: `scripts/full_schema.sql` (nếu có trong repo)
- Kiểm tra drift: `pnpm db:diff` (nếu có)

## 4) Roadmap tiếp theo (đã chốt)
- Auth/Login/Register “kiệt xuất” (tách module, session/token rõ ràng)
- Socket.IO realtime
- Redis cache session/menu
- Performance patch: chuyển `table_sessions` + `stock_holds` sang Redis
- Refactor Inventory: Redis atomic `DECR` thay vì MySQL lock

## 5) Lưu ý bảo mật
- File `.env` có thể chứa secret local. Khi handover: dùng `.env.example` và tự set lại secret.

## 2.5) Redis menu cache
Menu cache tự động bật khi:
- Có `REDIS_URL` và `MENU_CACHE_ENABLED=true`

Biến môi trường:
- `MENU_CACHE_ENABLED` (default: true)
- `MENU_CACHE_TTL_SECONDS` (default: 600)

Cache keys có version: `menu:v<ver>:...`.

