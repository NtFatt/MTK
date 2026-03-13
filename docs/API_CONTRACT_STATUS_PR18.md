# API Contract Status — PR18

Ngày cập nhật: 2026-03-13  
Branch: `be-pr18-contract-publication`  
Nguồn route map: `docs/API_ROUTE_MAP.generated.md`

## Mục tiêu
PR18 tập trung vào việc công bố contract backend rõ ràng để frontend có thể dùng như source of truth, không phải đoán endpoint, quyền hạn, error code hay protocol realtime.

## Phạm vi
- Publish route map từ backend ra docs
- Phân loại route theo trạng thái contract
- Chốt các route stable cho FE dùng
- Chỉ rõ các route còn pending clarification
- Khóa rõ legacy route không được dùng làm canonical contract

## 1. Stable
Các route trong nhóm này đã đủ điều kiện dùng làm canonical contract:
- Có trong route map
- Có behavior ổn định
- Không phụ thuộc legacy `/api/*`
- Đã được chứng minh bằng smoke hoặc negative verification

### 1.1 Public / Client
- `GET /api/v1/health`
- `GET /api/v1/menu/items`
- `POST /api/v1/client/otp/request`
- `POST /api/v1/client/otp/verify`
- `POST /api/v1/reservations`
- `POST /api/v1/carts/session/:sessionKey`
- `PUT /api/v1/carts/:cartKey/items`
- `POST /api/v1/orders/from-cart/:cartKey`
- `GET /api/v1/orders/:orderCode/status`
- `POST /api/v1/sessions/:sessionKey/close`

### 1.2 Admin / Internal auth
- `POST /api/v1/admin/login`
- `POST /api/v1/admin/staff`

### 1.3 Reservation / Session admin flow
- `PATCH /api/v1/admin/reservations/:reservationCode/confirm`
- `POST /api/v1/admin/reservations/:reservationCode/checkin`
- `POST /api/v1/admin/maintenance/run`

### 1.4 Ops / Staff
- `GET /api/v1/admin/ops/tables`
- `POST /api/v1/admin/ops/sessions/open`
- `POST /api/v1/admin/ops/carts/session/:sessionKey`
- `PUT /api/v1/admin/ops/carts/:cartKey/items`
- `POST /api/v1/admin/ops/orders/from-cart/:cartKey`
- `GET /api/v1/admin/ops/orders/:orderCode/status`
- `POST /api/v1/admin/ops/sessions/:sessionKey/close`

### 1.5 Kitchen / Cashier / Payment
- `GET /api/v1/admin/kitchen/queue`
- `POST /api/v1/admin/orders/:orderCode/status`
- `GET /api/v1/admin/cashier/unpaid`
- `POST /api/v1/admin/cashier/settle-cash/:orderCode`
- `POST /api/v1/admin/payments/mock-success/:orderCode`

### 1.6 Inventory / Cache
- `GET /api/v1/admin/inventory/stock`
- `POST /api/v1/admin/inventory/stock/adjust`
- `GET /api/v1/admin/inventory/holds`
- `POST /api/v1/admin/inventory/menu/bump`
- `GET /api/v1/admin/inventory/rehydrate/metrics`

### 1.7 Realtime / Observability
- `GET /api/v1/realtime/snapshot`
- `GET /api/v1/admin/observability/slow-queries`
- `GET /api/v1/admin/realtime/audit`

### 1.8 Stable invariants already verified
- Legacy `/api/*` không được coi là canonical contract
- Branch scope được ép ở internal routes
- Idempotency duplicate cho settle-cash và mock-success cho cùng response
- Oversell protection hoạt động đúng kiểu deterministic
- Realtime replay hoạt động

## 2. Stable nhưng cần chuẩn hóa thêm
Các route trong nhóm này chạy được nhưng cần rà lại một hoặc nhiều điểm sau:
- response envelope
- `error.code`
- `meta.requestId`
- naming field cho FE dùng ổn định

> Chưa điền chi tiết ở bước này.

## 3. Pending clarification
Các route hoặc protocol trong nhóm này chưa được chốt contract cuối cùng. Đây là các điểm cần xử lý trong PR18 để frontend không phải đoán.

### 3.1 Session bootstrap
- `GET /api/v1/sessions/:sessionKey`
- Trạng thái hiện tại: chưa được xác nhận là canonical contract dùng cho FE bootstrap
- Vấn đề: FE customer flow có thể cần endpoint này để đọc lại session theo `sessionKey`
- Quyết định cần chốt:
  - hoặc implement và publish chính thức
  - hoặc tuyên bố không hỗ trợ và FE phải bỏ dependency vào route này

### 3.2 Realtime join / replay protocol
- `join.v1`
- `replay.v1`
- Trạng thái hiện tại: realtime sanity đã pass, nhưng contract protocol chưa được publish thành artifact rõ ràng cho FE
- Vấn đề cần chốt:
  - payload client emit
  - ack server trả về
  - cursor / fromSeq semantics
  - room naming convention

### 3.3 Realtime event envelope
- Trạng thái hiện tại: FE đã dựa vào event envelope để invalidate/refetch, nhưng field-level contract chưa được công bố chính thức
- Cần chốt tối thiểu các field:
  - `type`
  - `room`
  - `seq`
  - `ts`
  - `payload`

### 3.4 Auth handshake cho socket
- Trạng thái hiện tại: behavior runtime có tồn tại, nhưng contract kết nối cho FE chưa được mô tả chính thức
- Cần chốt:
  - client gửi token bằng cách nào
  - role nào join được room nào
  - lỗi auth socket trả về theo shape nào

### 3.5 Response envelope chuẩn cho FE
- Một số route stable vẫn cần rà lại để FE dùng an toàn lâu dài:
  - success có `data`
  - error có `error.code`, `error.message`
  - response có `meta.requestId` hoặc correlation id tương đương
- Mục này chưa phải blocker runtime, nhưng là blocker contract-quality

### 3.6 Contract artifact trong `packages/contracts`
- Trạng thái hiện tại: route map đã generate được ở backend docs
- Cần làm tiếp:
  - publish `error-codes`
  - publish `query-keys`
  - publish `route-manifest`
  - publish `route-permissions`
  - publish `realtime-protocol`

## 4. Blocked / Legacy
Các route legacy `/api/*` không được coi là canonical contract khi `LEGACY_API_ENABLED=false`.

Frontend không được dùng nhóm route này để phát triển mới.

### 4.1 Contract rule
- Canonical contract chỉ nằm dưới `/api/v1/*`
- Mọi route `/api/*` legacy chỉ là compatibility mode khi bật legacy
- Khi `LEGACY_API_ENABLED=false`, FE phải coi `/api/*` là blocked

### 4.2 Đã được verify
- `GET /api/health` trả `404`
- `GET /api/admin/ops/tables?...` trả `404`
- Legacy route không được coi là fallback path cho FE

### 4.3 FE rule
- Không hardcode endpoint `/api/*`
- Không dùng legacy path làm fallback khi `/api/v1/*` lỗi
- Không phát triển tính năng mới dựa trên legacy route

### 4.4 Review rule
Nếu phát hiện bất kỳ module FE nào còn gọi `/api/*`, phải coi đó là contract violation và sửa về `/api/v1/*`

## Ghi chú
File này là tài liệu phân loại contract ở mức review/handover.  
Nguồn sự thật kỹ thuật vẫn phải được đẩy dần vào `packages/contracts`.