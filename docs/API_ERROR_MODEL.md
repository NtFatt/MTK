# API Error Model

Ngày cập nhật: 2026-03-13  
Branch: `be-pr18-contract-publication`

## Mục tiêu
Tài liệu này định nghĩa shape lỗi chuẩn mà frontend có thể tin cậy khi tích hợp với backend.

## FE-facing canonical shape
`ApiError` có các trường:
- `status`: mã HTTP
- `code`: mã lỗi nghiệp vụ hoặc hệ thống
- `message`: thông điệp lỗi
- `details`: dữ liệu lỗi chi tiết nếu có
- `correlationId`: mã truy vết nếu có

## Backend response expectation
Khi trả lỗi, backend nên ưu tiên shape sau:

- `error.code`
- `error.message`
- `meta.requestId`

Ví dụ:
- `error.code = FORBIDDEN`
- `error.message = You do not have permission`
- `meta.requestId = req_123`

## Success response expectation
Khi trả thành công, backend nên ưu tiên shape sau:

- `data`
- `meta.requestId`

## Canonical error code mapping

### 400
- `VALIDATION_ERROR`
- Ý nghĩa: dữ liệu đầu vào không hợp lệ

### 401
- `UNAUTHORIZED`
- Ý nghĩa: thiếu token, token sai, hoặc token hết hạn

### 403
- `FORBIDDEN`
- Ý nghĩa: không đủ quyền hoặc bị chặn bởi branch scope

### 404
- `NOT_FOUND`
- Ý nghĩa: resource không tồn tại hoặc route legacy bị khóa theo contract lock

### 409
- `OUT_OF_STOCK`
- `INVALID_STATE`
- `IDEMPOTENCY_CONFLICT`
- Ý nghĩa: xung đột nghiệp vụ hoặc trạng thái không hợp lệ

### 429
- `RATE_LIMITED`
- Ý nghĩa: bị giới hạn tần suất request

### 5xx
- `INTERNAL_ERROR`
- Ý nghĩa: lỗi phía server

## FE handling guideline

### 400
Hiển thị lỗi validation theo field hoặc theo message tổng

### 401
Thử refresh hoặc chuyển về login tùy flow

### 403
Hiển thị no-permission hoặc forbidden state, không retry mù

### 404
Hiển thị not-found state hoặc contract violation nếu gọi sai legacy route

### 409
Hiển thị business conflict rõ ràng, sau đó refetch nếu cần

### 429
Hiển thị thông báo chờ và backoff

### 5xx
Hiển thị fallback chung và ưu tiên log `correlationId` hoặc `requestId`

## Ghi chú
- `correlationId` phía FE có thể map từ `meta.requestId` của backend
- Không bắt buộc tất cả route phải đạt shape này ngay trong PR18
- Nhưng các route canonical cho FE nên được chuẩn hóa dần theo model này