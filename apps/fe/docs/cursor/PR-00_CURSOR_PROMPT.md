# PR-00 — Phase 0 Repo Standardization (SPEC v2.0) + Tailwind Tokens (UI Sample Parity)

## Input luật (bắt buộc đọc trước khi code)
1) FE Spec v2.0 Cursor Enterprise (guardrails + Appendix F folder template)
2) UI mẫu `hadilao-client-menu.zip` (tokens + animation + layout baseline)
3) Repo hiện tại `apps/fe` (từ `fe.zip`) — Vite + React Router + React Query + Zustand + socket.io-client

## Context (repo facts — KHÔNG được phá)
- `apps/fe/package.json` có script `predev: pnpm -C ../../packages/contracts build` → **giữ nguyên**.
- `vite.config.js` đang proxy `/api/v1` và `/socket.io` tới `http://localhost:3001` → **giữ nguyên**.
- File hiện có và hợp đồng nội bộ phải được preserve:
  - `src/lib/apiFetch.ts` (contract-first fetch wrapper; VITE_API_BASE default `/api/v1`)
  - `src/lib/contracts.ts` (re-export `qk`, `Schemas`, `normalizeApiError`)

## Goal
Thiết lập “nền” để PR-01 có thể port UI mẫu sang Vite mà không vỡ: Tailwind + tokens Hadilao + folder skeleton theo SPEC v2.

## Definition of Done (DoD)
A) Tailwind hoạt động trong Vite
- Có `tailwind.config.ts` + `postcss.config.*` đúng chuẩn Vite.
- `src/index.css` đổi sang Tailwind directives + **tokens & custom CSS** khớp UI mẫu (`app/globals.css`):
  - CSS variables palette Hadilao (background/foreground/primary/accent…)
  - custom animations: float-ornament, float-blossom, float-paper, shimmer-text, pulse-jade, fade-in-up
  - scrollbar styling + `.paper-texture` utility
- Xoá/loại bỏ CSS template mặc định của Vite (tránh conflict theme).

B) Folder skeleton theo Appendix F (SPEC v2)
- Tạo folders (empty ok) để khóa đường đi:
  - `src/app/` `src/layouts/` `src/features/` `src/shared/{auth,http,realtime,ui,utils}/`
- Tạo `src/shared/utils/cn.ts` (clone chuẩn từ UI mẫu: clsx + tailwind-merge).
- Tạo `src/shared/ui/README.md` ghi quy ước: primitives shadcn sẽ nằm đây từ PR-01.

C) Router + Providers skeleton (chỉ “khung”, chưa cần feature)
- Setup React Router tối thiểu theo SPEC:
  - Public routes: `/` redirect `/customer/menu`
  - Customer route placeholder: `/customer/menu` (page stub)
  - Internal route placeholder: `/internal` (page stub)
- Tạo `src/app/router.tsx` + `src/app/providers.tsx` + `src/app/App.tsx` (hoặc tương đương) để entrypoint rõ ràng.
- Entry: update `src/main.jsx` → `src/main.tsx` (hoặc giữ jsx nhưng wiring qua router/providers).
- Không được import Next APIs.

D) Lint/Typecheck alignment
- Update `eslint.config.js` để lint cả `**/*.{js,jsx,ts,tsx}` (hiện chỉ js/jsx).
- Ensure `pnpm -C apps/fe typecheck` chạy pass (tsconfig strict đã bật).

## Dependencies (install trong PR-00)
- Required (SPEC v2 + UI sample):
  - `tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate`
  - `clsx`, `tailwind-merge`, `class-variance-authority`
- Không add `next-themes` ở PR-00 (Next-specific naming; nếu cần theme switcher sẽ quyết ở PR-02).

## Implementation checklist (files expected)
- [ ] `apps/fe/tailwind.config.ts`
- [ ] `apps/fe/postcss.config.cjs` (hoặc `.js` ESM phù hợp)
- [ ] `apps/fe/src/index.css` (tokens Hadilao parity UI sample)
- [ ] `apps/fe/src/shared/utils/cn.ts`
- [ ] `apps/fe/src/app/{router.tsx,providers.tsx,App.tsx}`
- [ ] `apps/fe/src/layouts/{public,customer,internal}/` (có thể empty placeholder)
- [ ] `apps/fe/src/features/{customer/menu,pages-placeholder}/...` (tối thiểu 1 page stub)
- [ ] Update `apps/fe/src/main.*` để render App
- [ ] Update `apps/fe/eslint.config.js` để include ts/tsx
- [ ] Remove/clean `src/App.css` + CSS template usage nếu không còn dùng

## Acceptance commands (must paste outputs)
Run from repo root:
1) `pnpm -C apps/fe lint`
2) `pnpm -C apps/fe typecheck`
3) `pnpm -C apps/fe build`

## Notes (to prevent drift)
- Không port UI components ở PR-00. PR-01 mới làm.
- Không đụng `src/lib/apiFetch.ts` và `src/lib/contracts.ts` ngoài việc re-export nếu cần.
- Nếu cần alias `@/`: chỉ implement nếu chắc chắn không phá build (vite + tsconfig paths).
