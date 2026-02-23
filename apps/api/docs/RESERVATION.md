# Reservation Feature (Đặt bàn)

## Business rules
- Chọn **khu vực (areaName)** + **số người (partySize)** + **thời gian (reservedFrom, reservedTo)**.
- Hệ thống tự chọn bàn có **seats >= partySize**, đúng khu vực, đang **AVAILABLE**, và **không bị trùng slot thời gian** với các reservation PENDING/CONFIRMED/CHECKED_IN.
- Chỉ cho phép đặt **tối đa trước 7 ngày**.
- Reservation ở trạng thái **PENDING** sẽ tự **EXPIRED** khi quá **45 phút** kể từ lúc tạo (nhưng không được vượt quá reservedFrom).

## Public endpoints (khách)
### 1) Kiểm tra còn bàn
`GET /api/v1/reservations/availability?areaName=...&partySize=...&reservedFrom=...&reservedTo=...`

Response:
```json
{
  "available": true,
  "availableCount": 2,
  "suggestedTable": { "tableId": 1, "tableCode": "T01", "areaName": "Zone A", "seats": 4 }
}
```

### 2) Tạo reservation (PENDING)
`POST /api/v1/reservations`

Body:
```json
{
  "areaName": "Zone A",
  "partySize": 4,
  "contactPhone": "0900000000",
  "contactName": "Huy",
  "note": "8h tối",
  "reservedFrom": "2026-02-06T13:00:00.000Z",
  "reservedTo": "2026-02-06T14:30:00.000Z"
}
```

Response (201):
```json
{
  "reservationCode": "R...",
  "status": "PENDING",
  "table": { "tableId": 1, "tableCode": "T01", "areaName": "Zone A", "seats": 4 },
  "reservedFrom": "...",
  "reservedTo": "...",
  "expiresAt": "..."
}
```

### 3) Xem reservation theo code
`GET /api/v1/reservations/:reservationCode`

### 4) Hủy reservation
`POST /api/v1/reservations/:reservationCode/cancel`

## Admin endpoints
> Tất cả admin endpoints yêu cầu header: `Authorization: Bearer <ADMIN_TOKEN>`

### 1) Login admin (Option A)
`POST /api/v1/admin/auth/login`

Body:
```json
{ "username": "admin", "password": "admin123" }
```

Response:
```json
{ "token": "..." }
```

### 2) List reservation
`GET /api/v1/admin/reservations?status=PENDING&from=...&to=...&phone=...&limit=50`

### 3) Confirm reservation
`PATCH /api/v1/admin/reservations/:reservationCode/confirm`

### 4) Check-in (tạo table session và trả sessionKey)
`POST /api/v1/admin/reservations/:reservationCode/checkin`

Response:
```json
{ "sessionKey": "...", "tableId": 1, "reservationCode": "R..." }
```

## Postman
- Collection: `docs/postman/Reservation_Flow_v1.postman_collection.json`
- Environment: `docs/postman/Reservation_Flow_v1.postman_environment.json`

Flow chuẩn:
1) Availability
2) Create reservation
3) Admin Login
4) Admin Confirm
5) Admin Check-in (lấy sessionKey)
