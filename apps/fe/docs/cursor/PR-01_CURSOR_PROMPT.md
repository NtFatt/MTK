# PR-01 — Port UI mẫu “Customer Menu” (Next → Vite) — Cursor Prompt (COPY/PASTE)

> **Bạn đang làm trong repo:** `hadilao-online` (monorepo)  
> **Scope PR:** chỉ thay đổi trong `apps/fe/**`  
> **Nền đã có:** PR-00 đã pass `lint/typecheck/build`, có Tailwind + tokens Hadilao trong `src/index.css`, skeleton Appendix F, router đã map `/customer/menu` → `CustomerMenuPage`.

---

## 0) HARD CONSTRAINTS (KHÔNG ĐƯỢC VI PHẠM)

1) **Không dùng Next APIs**: tuyệt đối **không** `next/image`, `next/link`, `next/font`, `app/` router của Next.
2) **Không đụng ngoài `apps/fe/**`**.
3) **Không phá PR-00**: giữ `src/app/*`, `src/shared/*`, scripts, `vite.config.*` proxy, `src/lib/apiFetch.ts`, `src/lib/contracts.ts`.
4) **TypeScript-first**: mọi component mới là **`.tsx`**.
5) **Style**: chỉ dùng Tailwind + CSS variables (vd: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`…), không hardcode màu “đỏ/green/…” trong feature code.
6) **DoD phải pass**:
   - `pnpm -C apps/fe lint`
   - `pnpm -C apps/fe typecheck`
   - `pnpm -C apps/fe build`
   - `pnpm -C apps/fe dev` (mở `/customer/menu` chạy được)

---

## 1) MỤC TIÊU PR-01

Port “UI mẫu menu khách” (file 2) sang Vite theo kiến trúc PR-00:

- Route: `/customer/menu`
- UI có đủ: **Navbar + HeroBanner + CategoryTabs + MenuGrid/MenuCard + Skeleton + Empty + Footer**
- Data dùng **mock** (PR-02 mới nối API thật)
- Có cơ chế switch state để test nhanh:
  - `/customer/menu?state=ready` (default)
  - `/customer/menu?state=skeleton`
  - `/customer/menu?state=empty`

---

## 2) FILE/FOLDER PLAN (PHẢI ĐÚNG PATH)

Tạo/điền các file sau:

### 2.1 Feature: Customer Menu
```
apps/fe/src/features/customer/menu/
  pages/CustomerMenuPage.tsx
  components/
    CustomerNavbar.tsx
    HeroBanner.tsx
    CategoryTabs.tsx
    MenuGrid.tsx
    MenuCard.tsx
    MenuSkeleton.tsx
    MenuEmpty.tsx
    CustomerFooter.tsx
  data/mockMenu.ts
  types.ts
```

### 2.2 Shared UI primitives (shadcn-style, đặt đúng luật PR-00)
> PR-00 có `src/shared/ui/README.md` và `src/shared/utils/cn.ts` rồi.

Tạo các primitives tối thiểu (không cần chạy shadcn CLI; implement thủ công theo pattern shadcn + `cn()`):

```
apps/fe/src/shared/ui/
  button.tsx
  card.tsx
  badge.tsx
  tabs.tsx
  skeleton.tsx
  separator.tsx
```

> Nếu repo đã có sẵn primitives thì chỉ bổ sung thiếu, tránh rewrite lớn.

---

## 3) IMPLEMENTATION DETAILS (PHẢI LÀM ĐÚNG)

### 3.1 `mockMenu.ts` + `types.ts`
- `types.ts` định nghĩa:
  - `MenuCategory { id: string; name: string }`
  - `MenuItem { id: string; name: string; price: number; imageUrl?: string; categoryId: string; tags?: string[]; isAvailable: boolean }`
- `mockMenu.ts` export:
  - `CATEGORIES: MenuCategory[]` (>= 8)
  - `ITEMS: MenuItem[]` (>= 24)
- `imageUrl` có thể dùng URL placeholder (https://placehold.co/...) hoặc để undefined (handle graceful).

### 3.2 `CustomerMenuPage.tsx`
- Dùng React Router `useSearchParams()` để đọc `state`.
- `state` ∈ `ready | skeleton | empty` (default `ready`).
- Có state UI:
  - skeleton: render `MenuSkeleton`
  - empty: render `MenuEmpty`
  - ready: render full layout + data
- Phải có layout container chuẩn:
  - max width (vd: `max-w-6xl mx-auto px-4`)
  - spacing theo UI mẫu (hero + tabs + grid)

### 3.3 Navbar
- `CustomerNavbar`:
  - Brand “Hadilao” (text)
  - 1–2 action buttons (vd: “Giỏ hàng”, “Đăng nhập”) (chỉ UI, không logic)
  - Sticky + blur nhẹ (dùng classes), không hardcode màu

### 3.4 Hero banner
- `HeroBanner`:
  - Headline, subtext, 1 CTA button
  - dùng animation class đã có (vd: `fade-in-up`, `shimmer-text` nếu tồn tại)
  - nếu UI mẫu có “paper-texture”, dùng class `.paper-texture` ở wrapper

### 3.5 Category tabs
- `CategoryTabs`:
  - dùng primitive `Tabs` (shared/ui/tabs.tsx)
  - controlled: `activeCategoryId`, `onChange(categoryId)`
  - hiển thị tất cả categories + count item (optional)

### 3.6 Menu grid/card
- `MenuGrid`:
  - nhận `items: MenuItem[]`
  - responsive: 1 col mobile, 2 col md, 3 col lg (vd: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`)
- `MenuCard`:
  - dùng `Card` primitive
  - hiển thị image (nếu có) + name + price (format VND) + badges (tags) + trạng thái availability
  - button “Thêm” (disabled nếu `!isAvailable`)
  - không cần cart store trong PR-01

### 3.7 Skeleton/Empty
- `MenuSkeleton`:
  - render grid skeleton 6–9 cards bằng primitive `Skeleton`
- `MenuEmpty`:
  - message “Chưa có món phù hợp” + 1 nút “Thử lại” (UI only)
  - không call API

### 3.8 Footer
- `CustomerFooter`:
  - text nhẹ, links dummy, dùng `Separator`

---

## 4) SHARED UI PRIMITIVES REQUIREMENTS

Implement primitives theo style shadcn (đủ để compile + dùng được):

- `cn()` phải import từ `src/shared/utils/cn.ts`
- `button.tsx`: variant + size (dùng `class-variance-authority` đã cài trong PR-00)
- `card.tsx`: Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter
- `badge.tsx`: variant (default/secondary/outline)
- `tabs.tsx`: wrap Radix? **KHÔNG**. Vì chưa có radix deps.  
  → Implement tabs **tối giản** bằng state + aria roles trong component `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- `skeleton.tsx`: div animate-pulse
- `separator.tsx`: hr (hoặc div) dùng `bg-border`

> Tuyệt đối không thêm dependency mới (radix, lucide) trong PR-01 để tránh nổ scope.

---

## 5) UPDATE/VERIFY ROUTER (chỉ khi cần)

PR-00 đã có router map `/customer/menu` → `CustomerMenuPage`.  
Nếu router đang import path khác hoặc placeholder, cập nhật import đúng:
- `src/features/customer/menu/pages/CustomerMenuPage`

Không đổi thêm route mới trong PR-01.

---

## 6) QA QUICKCHECK (BẮT BUỘC)

Sau khi implement xong, **tự chạy và fix tới khi pass**:

1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`
4) `pnpm -C apps/fe dev` → mở:
   - `/customer/menu`
   - `/customer/menu?state=skeleton`
   - `/customer/menu?state=empty`

Không được để warning TS/ESLint kiểu “unused-vars”, “any”, “noImplicitAny”.

---

## 7) OUTPUT (WHAT TO COMMIT)

Chỉ commit thay đổi trong `apps/fe/**` theo đúng file plan.  
Commit message gợi ý:
- `fe: PR-01 customer menu UI baseline (ported from sample)`

---

## 8) IF YOU ARE ABOUT TO REFRACTOR… STOP

Nếu bạn thấy cần refactor lớn (move folder, đổi kiến trúc), **dừng**. PR-01 chỉ nhằm dựng baseline UI + primitives tối thiểu.  
PR-02 mới nối API, PR-03 mới chốt design system nâng cao.
