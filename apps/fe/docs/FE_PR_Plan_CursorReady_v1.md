# Hadilao FE — PR Plan (Cursor-ready) (v1)
> Mục tiêu: chia nhỏ công việc thành các PR “reviewable” (1–2h/PR), có checklist rõ ràng, để Cursor làm nhanh mà vẫn không drift spec.

---

## PR-00 — FE Foundation (TypeScript + Router + Providers)
**Branch**: `feat/fe-pr00-foundation`  
**Scope**
- Chuyển entry sang TSX: `main.tsx`, `App.tsx`.
- Cài + setup React Router DOM route skeleton.
- Setup Providers: React Query + (optional) Theme + Toaster placeholder.
- Dọn template Vite mặc định.

**Files**
- `src/main.tsx`, `src/app/App.tsx`, `src/app/routes.tsx`
- `src/app/providers/QueryProvider.tsx` (+ Toast/Theme stub)
- remove/replace `src/App.jsx`, `src/main.jsx`, `src/App.css` (tuỳ chọn)

**Acceptance**
- `pnpm dev` chạy, có route `/` render “Hello Hadilao”.
- `pnpm typecheck` pass.

**Cursor prompt (copy/paste)**
- “You are working in apps/fe (Vite + React 19). Convert entry to TSX, add react-router routes skeleton, add QueryClientProvider. Keep existing apiFetch.ts unchanged. No Next.js APIs.”

---

## PR-01 — Tailwind + Design Tokens + Alias
**Branch**: `feat/fe-pr01-tailwind-tokens`  
**Scope**
- Cài Tailwind + PostCSS.
- Port `globals.css` token set từ UI mẫu.
- Port `tailwind.config` mapping token -> colors.
- Add alias `@` -> `src` (vite + tsconfig paths).
- Add `cn()` util.

**Files**
- `tailwind.config.ts`, `postcss.config.*`
- `src/styles/globals.css`
- `src/lib/utils.ts`
- `vite.config.*`, `tsconfig.json`

**Acceptance**
- Dùng class `bg-background text-foreground` hoạt động.
- `cn()` dùng được.
- Alias import `@/lib/utils` ok.

**Cursor prompt**
- “Implement Tailwind + CSS variables tokens (from UI sample). Configure tailwind colors to use hsl(var(--...)). Add @ alias. Keep strict TS.”

---

## PR-02 — Import shadcn primitives (minimal set)
**Branch**: `feat/fe-pr02-shadcn-core`  
**Scope**
- Tạo `src/components/ui/*` tối thiểu: `button`, `input`, `badge`, `card`, `skeleton`, `tabs`, `dialog`, `sheet`, `sonner/toaster`.
- Cài deps cần thiết (radix, class-variance-authority, tailwind-merge, lucide-react, sonner…).

**Acceptance**
- Render được một trang “UI Playground” dùng các primitive.
- Không còn import đường dẫn Next.

**Cursor prompt**
- “Port shadcn/ui primitives into Vite project. Ensure exports are TSX. Use existing cn() util. Add only necessary dependencies.”

---

## PR-03 — Port Hadilao composition components (Navbar/Hero/…)
**Branch**: `feat/fe-pr03-hadilao-composition`  
**Scope**
- Port 7 component: `Navbar`, `HeroBanner`, `CategoryTabs`, `MenuCard`, `MenuGridSkeleton`, `EmptyState`, `Footer`.
- Replace `next/image` -> `<img>`.
- Chuẩn hoá text VN (có dấu) nếu muốn (optional).

**Acceptance**
- Có thể render toàn bộ layout sample trong 1 route `/ui/hadilao-menu` dùng mock.

**Cursor prompt**
- “Copy hadilao composition components from UI sample. Remove Next-only APIs. Keep styling & animations. Use primitives from src/components/ui.”

---

## PR-04 — Customer Menu Page (mock -> real page route)
**Branch**: `feat/fe-pr04-customer-menu-mock`  
**Scope**
- Tạo feature: `src/features/customer/menu/MenuPage.tsx`.
- Kết nối với compositions để render menu.
- Mock data nằm trong feature (không đặt trong component layer).
- Implement 4 states: loading/empty/error/ready (error có UI tối thiểu).

**Acceptance**
- Route `/menu` chạy, filter category + search hoạt động (mock).

**Cursor prompt**
- “Create customer menu feature module with clean folder structure. Use compositions and primitives. Implement consistent data states.”

---

## PR-05 — Menu API integration (React Query + contracts)
**Branch**: `feat/fe-pr05-menu-api`  
**Scope**
- Viết `useMenuItemsQuery()` dùng `apiFetch` + `qk.*`.
- Parse/validate bằng `Schemas.*` từ `@hadilao/contracts` (nếu schema có).
- Replace mock bằng API thật.

**Acceptance**
- `/menu` load từ API.
- Error normalize hiển thị toast hoặc inline error card.

**Cursor prompt**
- “Integrate menu list with React Query using apiFetch + qk from contracts. Validate payload via Schemas if available; otherwise add safe mapping layer without duplicating backend types.”

---

## PR-06 — Cart store (Zustand) + UI badge/Drawer
**Branch**: `feat/fe-pr06-cart-store`  
**Scope**
- Zustand store: add/remove/update qty.
- Navbar badge count = tổng qty.
- Cart drawer (`Sheet`) hiển thị items (tạm thời).

**Acceptance**
- Add to cart cập nhật badge.
- Cart drawer mở/đóng, hiển thị đúng.

**Cursor prompt**
- “Implement cart state with Zustand. Use shadcn Sheet for drawer. Keep code split: store in features/customer/cart.”

---

## PR-07 — Session bootstrap (table/sessionKey) + header wiring
**Branch**: `feat/fe-pr07-session-bootstrap`  
**Scope**
- Flow join/open session theo spec (table code / QR).
- Persist sessionKey (memory + localStorage).
- `apiFetch` wrapper tự add `X-Session-Key` (hoặc header spec) cho request cần.

**Acceptance**
- Reload vẫn giữ session.
- API calls có session header đúng.

**Cursor prompt**
- “Implement session bootstrap and persistence. Do not hardcode endpoints/headers; read from contracts/spec. Keep security: no secrets in localStorage except sessionKey.”

---

## PR-08 — Realtime wiring (Socket.IO join.v1 + replay.v1)
**Branch**: `feat/fe-pr08-realtime`  
**Scope**
- Socket client connect (base from env).
- join room theo sessionKey/role.
- replay cursor để sync state.
- Invalidate React Query caches khi nhận event.

**Acceptance**
- Khi backend emit event, UI tự refresh list/order status (demo bằng console log + invalidate).

**Cursor prompt**
- “Wire socket.io-client with join.v1 + replay.v1 semantics. Maintain reconnect + cursor. Use React Query invalidation rather than manual state mutation where possible.”

---

## Quy tắc review chung cho mọi PR
- Không merge PR khi:
  - typecheck fail
  - lint fail
  - UI drift: hardcode colors thay vì token
  - tự bịa contract endpoint/DTO
- Mỗi PR bắt buộc có:
  - `How to test` (3–5 bước)
  - “Non-goals” (những gì cố tình chưa làm)
