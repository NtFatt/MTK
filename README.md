# 🍲 Hệ Thống Quản Lý Tiệm Lẩu Trên Đường Hạnh Phúc (Haidilao Clone)

> **Dự Án Thực Tập Sinh (Internship Project)**  
> Một hệ thống quản lý nhà hàng toàn diện được xây dựng bằng kiến trúc Monorepo, tối ưu cho luồng nghiệp vụ thực tế của một chuỗi lẩu lớn. Dự án nhằm thể hiện năng lực Fullstack, kỹ năng thiết kế phần mềm, và khả năng giải quyết các bài toán hóc búa về Realtime, Concurrency, và Inventory.

---

## 🚀 Giới Thiệu Dự Án

Dự án là một hệ thống (Monorepo `pnpm workspace`) tích hợp đầy đủ cho quy trình gọi món, vận hành nhà hàng, quản lý kho (inventory/hold), thanh toán, đặt bàn (reservation) và đồng bộ thời gian thực (realtime).

Hệ thống được thiết kế theo hướng production-ready, với đầy đủ các package shared contract, smoke tests, CI/CD checking và API docs.

## 🛠 Tech Stack

- **Backend (`apps/api`)**: Node.js, Express, TypeScript, MySQL (Prisma ORM), Redis, Socket.IO.
- **Frontend (`apps/fe`)**: React, Vite, TanStack Query, Zustand, TailwindCSS, Socket.IO client.
- **Shared (`packages/contracts`)**: Định nghĩa chung về Schema (Zod), Route Map, Query Keys, API Contracts.
- **Tooling**: pnpm workspaces, ESLint, Prettier, Postman (Smoke Testing).

## ✨ Tính Năng Nổi Bật

1. **Phân Quyền Phức Tạp (RBAC)**: Hỗ trợ 7 role nội bộ (Admin, Manager, Kitchen, Waiter, Cashier, Inventory, v.v.).
2. **Luồng Khách Hàng (Customer Flow)**: QR Code tại bàn, đặt món thời gian thực, cập nhật trạng thái món từ bếp.
3. **Quản Lý Kho Chuyên Sâu (Inventory & Concurrency)**: Xử lý race conditions khi gọi món, tạm giữ kho (hold) bằng Redis để tránh overselling.
4. **Hệ Thống Đặt Bàn (Reservation)**: Kiểm tra khả năng phục vụ theo thời gian, quản lý danh sách đặt bàn và xếp bàn tối ưu.
5. **Realtime Operations**: Giao tiếp hai chiều bằng Socket.IO cho mọi module từ Kitchen, Waiter, đến Customer.

## 📦 Kiến Trúc (Architecture)
- **Monorepo**: Giúp đồng bộ hoá API interface giữa Backend và Frontend mà không bị lệch version.
- **Idempotency**: Ngăn chặn double-charge khi gửi request thanh toán hay đặt hàng.
- **Event-Driven**: Quản lý state của order và inventory qua các transaction events.

## 🚦 Chạy Dự Án Cục Bộ (Local Quickstart)

Yêu cầu môi trường:
- Node.js 22.x
- pnpm 10.x
- MySQL 8.0+
- Redis

```powershell
# 1. Cài đặt dependencies
pnpm install

# 2. Cấu hình biến môi trường
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/fe/.env.example apps/fe/.env

# 3. Setup Database (Reset và Seed dữ liệu mẫu)
pnpm -C apps/api db:reset --yes
pnpm -C apps/api seed:internal

# 4. Khởi chạy Backend và Frontend (Mở 2 terminal)
pnpm -C apps/api dev
pnpm -C apps/fe dev
```

- **API URL**: `http://localhost:3001`
- **Frontend URL**: `http://localhost:5173`

## 🧪 Testing & Verification

Hệ thống đi kèm với các bài kiểm thử (Smoke Tests) phức tạp để đảm bảo chất lượng:
```powershell
pnpm verify:all
pnpm release:check
```

- `smoke:full`: Kiểm thử luồng khách hàng + luồng vận hành (7 roles) + quản lý kho.
- `smoke:negative`: Xử lý ngoại lệ, mã lỗi HTTP và idempotency checks.
- `smoke:realtime`: Đồng bộ state realtime qua các Socket rooms.
- `smoke:oversell`: Xử lý tình trạng 2 khách cùng gọi món cuối cùng (Overselling prevention).

## 📄 Tài Liệu Liên Quan

- [Backend API Route Map](./docs/API_ROUTE_MAP.generated.md)
- [Cơ chế Source of Truth](./docs/final/SOURCE_OF_TRUTH.md)
- [RBAC Matrix](./RBAC_MATRIX.md)
- [Quy chuẩn thiết kế BE](./BE_SPEC.md)

---
*Developed with ❤️ as a demonstration of Fullstack Engineering capabilities.*
