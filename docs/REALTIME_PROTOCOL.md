# Realtime Protocol

Ngày cập nhật: 2026-03-14  
Branch: `be-pr18-contract-publication`

## Mục tiêu
Tài liệu này mô tả contract realtime tối thiểu giữa frontend và backend.

## Transport
- Socket.IO
- Path: `/socket.io`

## Room naming convention
- `sessionKey:{sessionKey}`
- `order:{orderCode}`
- `branch:{branchId}`
- `admin`

## Event envelope
Dữ liệu event realtime có dạng:
- `type`: tên event
- `room`: room nhận event
- `seq`: số thứ tự event
- `ts`: thời gian event
- `payload`: dữ liệu thật của event

## Client emits

### `join.v1`
Frontend gửi lên:
- `room`
- `cursor` (có thể có hoặc không)

### `replay.v1`
Frontend gửi lên:
- `room`
- `fromSeq` (có thể có hoặc không)

## Server acknowledgements

### `join.v1` ack
Backend trả về:
- `ok`
- `room`
- `cursor` (có thể có hoặc không)

### `replay.v1` ack
Backend trả về:
- `ok`
- `room`
- `items` (danh sách event replay)

## Contract notes
- `seq` phải tăng dần trong từng room
- Frontend chỉ coi realtime là tín hiệu để refresh hoặc refetch
- Dữ liệu thật cuối cùng vẫn phải lấy từ API
- Khi đổi protocol implementation, phải cập nhật cả file này và `packages/contracts/src/realtime-protocol.ts`