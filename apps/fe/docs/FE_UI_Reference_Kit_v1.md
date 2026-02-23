# Hadilao FE — UI Reference Kit (v1)
> Nguồn: `hadilao-client-menu.zip` (UI mẫu) + hiện trạng `apps/fe` (fe.zip).  
> Mục tiêu: chuẩn hoá “giao diện mẫu” thành **UI Kit có thể port sang Vite/React Router**, dùng được làm baseline cho toàn bộ FE (Customer + Internal Console).

---

## 1) Bóc tách nhanh 2 repo

### File 2 — UI mẫu (hadilao-client-menu.zip)
**Stack**: Next (App Router) + Tailwind + shadcn/ui (Radix) + lucide-react + next-themes.  
**Điểm mạnh**:
- Bộ **design tokens** qua CSS variables (`--background`, `--primary`, `--radius`…) + Tailwind mapping.
- “Hadilao Origami” style: typography serif/sans, gradient hairline, shadow/hover tinh tế, animation nhẹ.
- Bộ component composition sẵn: `Navbar`, `HeroBanner`, `CategoryTabs`, `MenuCard`, `MenuGridSkeleton`, `EmptyState`, `Footer`.
- Có sẵn full shadcn primitives (`components/ui/*`) đủ dùng cho cả Customer và Admin Console.

**Điểm cần port** (vì Next-specific):
- `next/image` trong `MenuCard`
- `next/font/google` trong `layout.tsx`
- cấu trúc `app/` và directive `"use client"`

### File 3 — apps/fe hiện tại (fe.zip)
**Stack**: Vite + React 19 + React Router DOM + TanStack Query + Zustand + socket.io-client.  
**Hiện trạng**:
- Mới ở mức template (App.jsx).
- Đã có `apiFetch.ts` (chuẩn: base `/api/v1`, normalizeApiError, idempotency opt-in).
- Vite proxy sẵn `/api/v1` + `/socket.io` (đúng để dev local).

**Thiếu**:
- Tailwind + shadcn/ui + design tokens.
- Router layout, pages structure, feature modules.
- UI kit (primitive + composition) và guideline chuẩn hoá.

---

## 2) Chuẩn hoá UI Kit: nguyên tắc (chuẩn enterprise)

### 2.1. Design tokens (bắt buộc)
- **Nguồn gốc**: giữ nguyên token set từ UI mẫu (CSS variables).
- **Không hardcode màu** trong feature code (trừ “hadilao accent” đã được thống nhất).
- Tailwind config map **đúng** như UI mẫu: `colors.background = hsl(var(--background))`, …

### 2.2. Component layers
- **Primitives**: `src/components/ui/*` (shadcn ui)
- **Compositions**: `src/components/hadilao/*` (Navbar/Hero/…)
- **Feature UI**: `src/features/<domain>/**` (page, hooks, vm mapping)

### 2.3. Định danh & style guide
- File/Component: `kebab-case.tsx` cho file; `PascalCase` cho component.
- Props: ưu tiên `interface` + explicit types.
- Classnames: dùng `cn()` (clsx + tailwind-merge).
- State UX: mọi page có **4 state chuẩn**: `loading / empty / error / ready`.

---

## 3) “Porting blueprint” (Next UI mẫu -> Vite apps/fe)

### 3.1. Folder chuẩn đề xuất cho apps/fe
```
src/
  app/
    App.tsx
    routes.tsx
    providers/
      QueryProvider.tsx
      ToastProvider.tsx
      ThemeProvider.tsx
  components/
    ui/                # shadcn primitives
    hadilao/           # Navbar/Hero/...
  features/
    customer/
      menu/
        MenuPage.tsx
        hooks.ts
        types.ts
        mock.ts
  lib/
    apiFetch.ts
    contracts.ts
    utils.ts           # cn()
    format.ts
  styles/
    globals.css
```

### 3.2. Những thay đổi bắt buộc khi port component
- Xoá `"use client"`.
- Thay `next/image` -> `<img />` + `loading="lazy"` + `decoding="async"`.
- Font:
  - Option A (nhanh): `<link rel="preconnect">` + `<link href="https://fonts.googleapis.com/...">` trong `index.html`.
  - Option B (ổn định): dùng `@fontsource/*` (khuyến nghị nếu muốn “offline reproducible”).
- `@/` alias:
  - Vite: alias `@` -> `src`
  - TS: `compilerOptions.paths` tương ứng.

### 3.3. Bộ tối thiểu cần port ngay (để có baseline)
- `styles/globals.css` (tokens + animations)
- `tailwind.config.*` + `postcss.config.*`
- `lib/utils.ts` (cn)
- `components/ui`: tối thiểu `button`, `input`, `badge`, `card`, `skeleton`, `tabs`, `dialog`, `sheet/drawer`, `sonner/toast`.
- `components/hadilao`: 7 component đã có.

---

## 4) Chuẩn “Giao diện mẫu” sau khi chuẩn hoá (Definition of Done)
1) Chạy được page **Customer Menu** trên Vite:
   - Navbar search + cart badge
   - Category tabs
   - Grid card + skeleton + empty state
   - Footer
2) Không còn Next-only import.
3) `pnpm -C apps/fe typecheck && pnpm -C apps/fe lint && pnpm -C apps/fe build` pass.
4) UI token & style nằm trong `styles/globals.css`, không nằm rải rác.
5) Components có thể tái dùng cho các module khác (Cart/Checkout/Console).

---

## 5) Checklist để feed Cursor (đưa vào prompt)
- “Không dùng Next.js APIs.”
- “Không tự chế API contract; gọi qua `apiFetch` + `@hadilao/contracts`.”
- “Giữ đúng folder layering: ui -> hadilao -> features.”
- “Luôn viết TSX, strict typecheck pass.”
