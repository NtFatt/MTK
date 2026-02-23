# P1.2 – Enterprise Patch (Compile + Spec Alignment)

**Ngày:** 2026-02-08

**Mục tiêu:** Fix compile (strict TypeScript) + align hành vi theo spec trước khi triển khai Redis session store + Redis stock-holds.

## Thay đổi

- **TableSession**: bổ sung `closedAt: Date | null` (default `null`) để khớp DB `table_sessions.closed_at` và tránh lệch constructor với MySQL repo.
- **OpenTableSession**: trả thêm cờ `created` (true nếu tạo mới session, false nếu reuse) để controller quyết định HTTP 201/200.
- **token.ts**: dùng tuple assertion khi `split('.')` (tránh `noUncheckedIndexedAccess`), và chỉ set `phone` khi có giá trị (tránh `exactOptionalPropertyTypes`).
- **password.ts**: dùng tuple assertion khi `split('$')` (tránh `noUncheckedIndexedAccess`).
- **ApplyPaymentSuccess / ChangeOrderStatus**: publish domain event không set `scope: undefined` (optional property) – chỉ gắn `scope` khi có.
- **Cart Upsert/Remove**: `scope.sessionId` luôn null-safe (`?? null`); `remove()` không truyền `optionsHash: undefined`.
- **server.ts**: Socket.IO options cast (fix typings), không pass `redis: undefined` vào `createApp`, chuẩn hoá catch `unknown`.
- **RedisEventBus / redisClient**: bổ sung typing cho callback params (`message: string`, `err: unknown`).

## Ghi chú
Patch này chỉ tập trung **stabilize & compile**. Roadmap tiếp theo: Redis session store (`sess:*` TTL), Redis atomic stock-holds (Lua/DECR), chuẩn hoá Socket rooms + Postman smoke.
