# @hadilao/contracts

**Mục tiêu:** biến “contract lock” thành **code lock**.

## Thành phần

- `queryKeys.ts` — chuẩn hoá query keys cho TanStack Query.
- `errors/*` — chuẩn hoá error code + `normalizeApiError()` để UI xử lý thống nhất.
- `schemas/*` — Zod **skeleton** cho request/response (ban đầu permissive, tighten dần theo OpenAPI/Orval).

## Quy tắc sử dụng (bắt buộc)

1) **Không hardcode queryKey** trong component/hook.
- Luôn dùng `qk.*`.

2) **Không xử lý error rải rác**.
- Luôn normalize: `normalizeApiError(err)`

3) **Không bịa schema**.
- Chỉ khai báo tối thiểu; khi có OpenAPI sẽ tăng strict.

## Ví dụ

```ts
import { qk, normalizeApiError, Schemas } from "@hadilao/contracts";

const key = qk.menu.items({ categoryId: 1, page: 1 });

try {
  // call api
} catch (e) {
  const ne = normalizeApiError(e);
  // toast(ne.userMessage)
}

const parsed = Schemas.zMenuItem.array().safeParse(data);
```
