# Hadilao Online — Progress Checklist

## 1. Project Snapshot

| Field | Value |
|---|---|
| Project | Hadilao Online |
| Last updated | 2026-05-01 |
| Repo | pnpm workspace: `apps/api`, `apps/fe`, `packages/contracts` |
| Shared-code note | `packages/shared` was not found; shared FE code is under `apps/fe/src/shared` |
| Overall status | Local-demo and handoff-safe. Customer reservations and internal login now have fresh browser evidence, and PR-18 closeout is narrowed to a documented metrics-contract exception plus two real FE runtime gaps: the outside-window reservations conflict banner is still generic, and ops tables live detail still cannot rediscover the active session/cart after POS handoff. |
| Current active task | Close the remaining FE runtime gaps exposed by internal verification, then do a final PR-18 closeout pass. |
| Active milestone | `PR-18 — API Contract Publication + Runtime Evidence Cleanup` with `PR-07` runtime follow-up |
| Next recommended task | Fix and rerun `/i/1/reservations` outside-window conflict messaging and `/i/1/tables` live-detail session/cart lookup, then repeat the internal browser pass while local FE/API remain bootable. |
| Validation confidence | High for contracts, API/FE builds, customer reservations, internal login, and internal POS handoff; medium for internal reservations because one conflict path still mismatches the expected UX; low-to-medium for ops tables because live detail failed on real data. |
| Main risks | Generic 409 conflict banner on outside-window reservation check-in, ops tables live-detail session/cart lookup failure after POS handoff, env-conditional `/api/v1/metrics` kept outside the static contracts package by design, 1 pre-existing FE lint warning |

## 2. Progress Legend

- `[ ] NOT STARTED`: no meaningful implementation found
- `[~] IN PROGRESS`: implementation exists but the phase is still open
- `[x] DONE`: implementation exists and validation evidence is present
- `[!] BLOCKED`: progress depends on a missing or unclear contract, or on missing verification that must be refreshed before claiming closure
- `[L] LITE DONE`: implementation exists and has meaningful evidence, but contract or fresh validation still lags full closeout

## 3. Master Phase Overview

| Phase | Status | Done note | Validation | Caveat / next |
|---|---|---|---|---|
| PR-00 Foundation | `[x]` | Workspace scripts, app shell, providers, router, and shared UI/auth/http/realtime layers exist. Files: `package.json`, `pnpm-workspace.yaml`, `apps/fe/src/app/*`, `apps/fe/src/shared/*`. | `pnpm -C apps/fe lint`, `typecheck`, `build` PASS on 2026-05-01; FE dev responded on `http://localhost:5173`. | Browser verification is now active on the local dev app. |
| PR-01 UI Baseline | `[x]` | Customer menu UI and shared primitives exist. Files: `apps/fe/src/features/customer/menu/*`, `apps/fe/src/shared/ui/*`. | Current FE static gates PASS. | Fresh browser walkthrough for menu/cart is not recorded in this run. |
| PR-02 HTTP/Data Layer | `[L]` | `apiFetch`, `authedFetch`, `useAppQuery`, `useAppMutation`, `queryKeys`, schemas, `route-manifest`, and `route-permissions` exist. Contract publication covers the active customer, admin, ops, inventory, maintenance, staff, observability, and voucher surfaces in backend source. | `pnpm -C packages/contracts build`, `pnpm -C apps/api route:map`, `pnpm -C apps/fe typecheck`, and `pnpm -C apps/fe build` PASS on 2026-05-01. | `/api/v1/metrics` remains a documented env-scoped exception instead of a static contract entry. |
| PR-03 Internal Auth + RBAC | `[x]` | Internal auth store/API, permission helpers, route guards, and admin guard are wired into the router. Files: `apps/fe/src/shared/auth/*`, `apps/fe/src/app/router.tsx`. | `pnpm -C apps/api seed:internal` PASS on 2026-05-01; browser login PASS for `bm01 / 123456` to `/i/1/reservations` and `staff01 / 123456` to `/i/1/tables`. | Local demo accounts needed reseeding before branch-scoped staff login would succeed. |
| PR-04 Customer Session + Cart | `[L]` | Customer session bootstrap, session store/API, and cart hooks/pages/services are present. Files: `apps/fe/src/shared/customer/session/*`, `apps/fe/src/features/customer/cart/*`, `apps/fe/src/features/customer/session/*`. | Current FE static gates PASS; historical core-flow verification exists in `docs/PR20_BASELINE.md`. | Customer session/menu/cart/checkout browser rerun is still pending in this run. |
| PR-05 Checkout + Order Status | `[L]` | Checkout, order status, and payment flows are present. Files: `apps/fe/src/features/customer/order/*`, `apps/fe/src/features/customer/payment/*`. | Current FE static gates PASS; historical runtime evidence exists in repo docs. | `CustomerPaymentPage.tsx` still has one pre-existing lint warning and no fresh payment browser rerun was recorded. |
| PR-06 Realtime Infra Lite | `[x]` | Singleton realtime manager, socket client, join/replay helpers, cursor store, and room hooks are present. Files: `apps/fe/src/shared/realtime/*`, `packages/contracts/src/realtime-protocol.ts`, `docs/REALTIME_PROTOCOL.md`. | Current FE static gates PASS; API build PASS on 2026-05-01. | Realtime runtime smoke was not rerun in this session. |
| PR-07 Internal Ops Tables | `[~]` | Tables page, search, and POS handoff are implemented and now have real browser proof. Files: `apps/fe/src/features/internal/ops/tables/*`, `apps/fe/src/features/internal/pos/*`, `apps/api/src/interface-adapters/http/routes/admin-ops.route.ts`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`. | Browser PASS on 2026-05-01 for `/i/1/tables` load, search `A11`, `Gọi món` handoff to `/i/1/pos/menu`, and cart update with 1 item. Static validation: `pnpm -C packages/contracts build`, `pnpm -C apps/api build`, `pnpm -C apps/fe lint`, `typecheck`, and `build` PASS. | `Chi tiết` on A11 and B01 still reported “Bàn chưa có phiên” instead of loading the active session/cart detail after POS handoff, so PR-07 runtime proof is still open. |
| PR-08 Kitchen Board | `[L]` | Kitchen queue page, hooks, services, and realtime integration are implemented. Files: `apps/fe/src/features/internal/kitchen/*`, `apps/api/src/interface-adapters/http/routes/admin-kitchen.route.ts`. | Current FE static gates PASS; API build PASS on 2026-05-01. | Fresh browser/runtime verification missing in this run. |
| PR-09 Cashier + Payment | `[L]` | Cashier queue/settle flows, idempotency helpers, and customer payment pages are implemented. Files: `apps/fe/src/features/internal/cashier/*`, `apps/fe/src/features/customer/payment/*`, `apps/api/src/interface-adapters/http/routes/admin-cashier.route.ts`. | Current FE static gates PASS; API build PASS on 2026-05-01. | Fresh browser/runtime verification missing in this run. |
| PR-10 Inventory | `[L]` | Stock, holds, adjustments, items, alerts, rehydrate, and menu-recipe inventory flows are implemented and now published in contracts. Files: `apps/fe/src/features/internal/inventory/*`, `apps/fe/src/features/internal/menu/*`, `apps/api/src/interface-adapters/http/routes/admin-inventory.route.ts`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`. | `pnpm -C packages/contracts build` and current FE static gates PASS on 2026-05-01. | Fresh browser/runtime verification missing in this run. |
| PR-11 PWA / Offline / Menu Polish | `[~]` | Menu polish exists through customer menu visuals, empty/error/loading states, and cart affordances. Files: `apps/fe/src/features/customer/menu/*`. | Current FE static gates PASS. | No PWA/offline implementation evidence was found. |
| PR-12 Hardening + Testing | `[L]` | Root verify scripts, API smoke scripts, PR20 verification docs, final handoff docs, and current customer/internal browser evidence exist. Files: root `package.json`, `apps/api/package.json`, `docs/PR20_BASELINE.md`, `docs/final/*`. | `pnpm -C packages/contracts build`, `pnpm -C apps/api route:map`, `pnpm -C apps/api build`, `pnpm -C apps/fe lint`, `typecheck`, and `build` PASS on 2026-05-01. | No repo FE Playwright suite was found, and the reproduced internal FE runtime gaps still need a follow-up fix and rerun. |

## 4. Additional Implemented Scope Beyond Original PR-12 Roadmap

| Area | Status | Done note | Validation | Caveat |
|---|---|---|---|---|
| Customer reservations | `[x]` | Public reservation contracts, API, hooks, detail/cancel flows, and selectable-table creation flow are implemented. Files: `packages/contracts/src/schemas/reservations.ts`, `apps/api/src/interface-adapters/http/controllers/ReservationController.ts`, `apps/api/src/application/use-cases/reservation/*`, `apps/fe/src/features/customer/reservations/*`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`. | API evidence in this run: missing `branchId` returned `400 BRANCH_ID_REQUIRED`; valid `branchId=1` returned `200` with `available=true`, `availableCount=7`, suggested table `A01`. Browser evidence in this run: `/c/reservations` selectable-table flow switched from suggested `B01` to chosen `A16`, created `RSV2643F45A2`, opened detail, then canceled successfully. | No automated FE E2E suite was found in repo. |
| Internal reservations / maintenance | `[~]` | Internal reservations page and maintenance routes/controllers exist, and the check-in flow now has real browser proof for both an outside-window conflict and an in-window success path. Files: `apps/fe/src/features/internal/reservations/pages/InternalReservationsPage.tsx`, `apps/fe/src/shared/http/normalizeApiError.ts`, `apps/api/src/interface-adapters/http/routes/admin-reservation.route.ts`, `apps/api/src/interface-adapters/http/routes/admin-maintenance.route.ts`. | `pnpm -C apps/fe lint`, `typecheck`, `build`, and `pnpm -C apps/api build` PASS on 2026-05-01; browser verification confirmed `RSV130021A9B` conflict behavior and `RSV09B7D6C2D` check-in success. | The outside-window path still shows a generic conflict banner instead of the expected friendly `Chưa tới khung giờ check-in...` copy. |
| Dashboard / shifts / attendance / payroll | `[L]` | Feature folders, router entries, route publication, and matching API routes exist. Files: `apps/fe/src/features/internal/{dashboard,shifts,attendance,payroll}/*`, `apps/api/src/interface-adapters/http/routes/admin-*.route.ts`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`. | Contracts build, API build, and FE static gates PASS on 2026-05-01. | Fresh browser/runtime verification missing in this run. |
| Vouchers / observability / realtime admin | `[L]` | Management pages, API routes, and contract publication exist. Files: `apps/fe/src/features/internal/{vouchers,observability,realtime-admin}/*`, `apps/api/src/interface-adapters/http/routes/{admin-voucher.route.ts,admin-observability.route.ts,admin-realtime.route.ts}`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`. | Contracts build, API build, and FE static gates PASS on 2026-05-01. | Fresh browser/runtime verification missing in this run. |

## 5. Current Focus

### A. Customer Reservations

- Status: `[x] DONE`
- Done note: the customer reservations flow has published reservation contracts, availability lookup, selectable-table UX, create/detail/cancel APIs, and FE detail/cancel handling.
- Files/modules: `packages/contracts/src/schemas/reservations.ts`, `packages/contracts/src/schemas/index.ts`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`, `apps/api/src/application/use-cases/reservation/*`, `apps/api/src/interface-adapters/http/controllers/ReservationController.ts`, `apps/fe/src/features/customer/reservations/*`
- Validation: `pnpm -C apps/fe lint` PASS on 2026-05-01 with 1 pre-existing warning outside reservations, `pnpm -C apps/fe typecheck` PASS, `pnpm -C apps/fe build` PASS, API availability 400/200 evidence captured, and browser flow PASS for select table `A16` → create `RSV2643F45A2` → detail → cancel.
- Caveat: no automated browser suite exists in repo.

### B. PR-18 — API Contract Publication

- Status: `[~] IN PROGRESS`
- Done note: `route-manifest.ts` and `route-permissions.ts` publish the active backend route groups for ops sessions/carts/orders, maintenance, inventory extensions, menu recipe, staff, dashboard/shifts/attendance/payroll, observability/realtime admin, public session/cart/payment/voucher helpers, and the legacy compat admin order status route. The backend route map was regenerated in this run.
- Files/modules: `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`, `packages/contracts/src/rbac.ts`, `packages/contracts/src/queryKeys.ts`, `docs/API_ROUTE_MAP.generated.md`, `apps/api/src/interface-adapters/http/routes/*.ts`
- Validation: `pnpm -C apps/api route:map` PASS on 2026-05-01; `pnpm -C packages/contracts build` PASS; `pnpm -C apps/api build` PASS; `pnpm -C apps/fe lint`, `typecheck`, and `build` PASS against the current contracts package.
- Decision: keep `/api/v1/metrics` outside `route-manifest.ts` and `route-permissions.ts` as a documented env-scoped exception because `METRICS_REQUIRE_ADMIN` can make the same route either permission-guarded or public at runtime.
- Remaining gap: PR-18 contract publication is functionally closed except for recording this env-scoped exception cleanly in handoff/review notes. The open work is now runtime follow-up, not missing route publication.

### C. Internal Reservations Check-in UX

- Status: `[~] IN PROGRESS`
- Done note: `InternalReservationsPage` shows status-aware check-in guidance, and browser verification now confirms both an outside-window conflict path and an in-window success path on real reservations.
- Files/modules: `apps/fe/src/features/internal/reservations/pages/InternalReservationsPage.tsx`, `apps/fe/src/shared/http/normalizeApiError.ts`
- Validation: `pnpm -C apps/api seed:internal` PASS on 2026-05-01; browser login PASS for `bm01 / 123456`; outside-window reservation `RSV130021A9B` stayed usable after check-in attempt and refetch, and in-window reservation `RSV09B7D6C2D` changed to `CHECKED_IN` with success banner `SessionKey: a51f07b2-4544-11f1-b151-9c2dcd558dd0`.
- Caveat: the outside-window UX still surfaced a generic conflict banner `Dữ liệu xung đột hoặc trạng thái đã thay đổi. Vui lòng tải lại.` instead of the expected friendly `Chưa tới khung giờ check-in...` copy, so this flow is only partially closed.

### D. PR-07 — Ops Tables Runtime Proof

- Status: `[~] IN PROGRESS`
- Done note: the page-level API cleanup is in place, tables page search works, and POS handoff now has browser proof on A11.
- Files/modules: `apps/fe/src/features/internal/ops/tables/*`, `apps/fe/src/features/internal/pos/*`, `apps/api/src/interface-adapters/http/routes/admin-ops.route.ts`, `packages/contracts/src/route-manifest.ts`, `packages/contracts/src/route-permissions.ts`
- Validation: browser PASS on 2026-05-01 for `/i/1/tables` load, search `A11`, `Gọi món` to `/i/1/pos/menu`, and cart update with `Ba chỉ bò cuộn phô mai` qty `1`; `pnpm -C packages/contracts build`, `pnpm -C apps/api build`, `pnpm -C apps/fe lint`, `typecheck`, and `build` PASS.
- Caveat: returning to `/i/1/tables` and clicking `Chi tiết` on both A11 and B01 still showed `Bàn chưa có phiên. Bấm Gọi món để mở phiên trước.` instead of active session/cart detail, so live-detail proof is currently failing on real data.

## 6. Validation Snapshot

| Check | Status | Evidence | Note |
|---|---|---|---|
| `pnpm -C apps/api seed:internal` | PASS | Run in this session on 2026-05-01 | Restored `bm01`, `staff01`, and other demo accounts for branch `1` |
| Internal browser login | PASS | `bm01 / 123456` reached `/i/1/reservations`; `staff01 / 123456` reached `/i/1/tables` in this session | Reseeding was required before branch-scoped staff login would work |
| `pnpm -C apps/api route:map` | PASS | Run in this session on 2026-05-01 | Regenerated `docs/API_ROUTE_MAP.generated.md` with `canonical=113`, `legacyOn=113` |
| `pnpm -C packages/contracts build` | PASS | Run in this session on 2026-05-01 | Current contract package compiles after route publication updates |
| `pnpm -C apps/api build` | PASS | Run in this session on 2026-05-01 | Current API build succeeds |
| `pnpm -C apps/fe lint` | PASS | Run in this session on 2026-05-01 | 1 pre-existing warning in `apps/fe/src/features/customer/payment/pages/CustomerPaymentPage.tsx` |
| `pnpm -C apps/fe typecheck` | PASS | Run in this session on 2026-05-01 | No current FE type errors |
| `pnpm -C apps/fe build` | PASS | Run in this session on 2026-05-01 | Current FE build succeeds |
| `pnpm -C apps/fe dev` | STARTED | Local FE dev responded on `http://localhost:5173` in this session | Browser verification used the local FE dev app |
| `GET /api/v1/health` | PASS | `http://127.0.0.1:3001/api/v1/health` returned `200` in this session | Local API was reachable |
| Reservation availability without `branchId` | PASS | `GET /api/v1/reservations/availability?...` returned `400 BRANCH_ID_REQUIRED` in this session | Confirms missing-branch validation is active |
| Reservation availability with `branchId=1` | PASS | `GET /api/v1/reservations/availability?...branchId=1...` returned `200` with `available=true`, `availableCount=7`, suggested table `A01` | Fresh API evidence replaces older stale numbers |
| Customer reservation browser flow | PASS | `/c/reservations` loaded, suggested `B01`, switched to `A16`, created `RSV2643F45A2`, opened detail page, then canceled successfully | Current browser proof exists for availability, selection, create, detail, and cancel |
| Internal reservations page load | PASS | `/i/1/reservations` loaded after browser login in this session | Real internal page proof now exists |
| Outside-window reservation check-in | PARTIAL PASS | `RSV130021A9B` remained usable after check-in attempt and list refetch | Backend conflict is safe, but FE showed generic banner `Dữ liệu xung đột hoặc trạng thái đã thay đổi. Vui lòng tải lại.` instead of the expected friendly `Chưa tới khung giờ check-in...` message |
| In-window reservation check-in | PASS | `RSV09B7D6C2D` changed to `CHECKED_IN` with success banner including `SessionKey: a51f07b2-4544-11f1-b151-9c2dcd558dd0` | Confirms success path and status update on `/i/1/reservations` |
| Ops tables page load + search | PASS | `/i/1/tables` loaded and search `A11` reduced the view to `1 / 7` bàn | Search/filter remains usable |
| POS handoff | PASS | `staff01` clicked `Gọi món` on A11, landed on `/i/1/pos/menu`, and added `Ba chỉ bò cuộn phô mai` qty `1` | Selected table/session/cart context was usable in POS |
| Ops tables live-detail browser flow | FAIL | Returning to `/i/1/tables` and clicking `Chi tiết` on A11 and B01 showed `Bàn chưa có phiên. Bấm Gọi món để mở phiên trước.` | Live detail did not rediscover the active session/cart on real data |

## 7. Blockers and Risks

| ID | Status | Area | Blocker / risk | Evidence | Next action |
|---|---|---|---|---|---|
| B-01 | `[~]` | Contracts | `/api/v1/metrics` is intentionally still outside `route-manifest.ts` and `route-permissions.ts` because `METRICS_REQUIRE_ADMIN` can switch the same route between guarded and public at runtime. | `apps/api/src/infrastructure/http/express/app.ts`; regenerated `docs/API_ROUTE_MAP.generated.md` on 2026-05-01 | Keep this as a documented env-scoped exception unless the contracts package grows explicit environment-aware metadata |
| B-02 | `[!]` | Internal reservations UX | Outside-window check-in is still surfacing a generic conflict banner instead of the expected friendly Vietnamese `RESERVATION_NOT_IN_TIME_WINDOW` copy. | Browser verification on `/i/1/reservations` with `RSV130021A9B` on 2026-05-01 | Fix the FE conflict-message mapping path, then rerun the outside-window check-in browser case |
| B-03 | `[!]` | Ops tables runtime | `Chi tiết` on A11 and B01 could not rediscover the active session/cart after real POS activity and instead showed `Bàn chưa có phiên. Bấm Gọi món để mở phiên trước.` | Browser verification on `/i/1/tables` and `/i/1/pos/menu` on 2026-05-01 | Fix session/cart lookup linkage for live detail, then rerun `/i/1/tables` → `Chi tiết` |
| B-04 | `[~]` | FE lint hygiene | One pre-existing warning remains in `CustomerPaymentPage.tsx`. | Current `pnpm -C apps/fe lint` output | Fix or consciously defer in a separate scoped task |
| B-05 | `[~]` | Local environment | Meaningful runtime verification still depends on local MySQL + Redis state and seeded demo accounts. | `docs/final/KNOWN_ISSUES.md`, `pnpm -C apps/api seed:internal` was required in this run | Rerun `seed:internal` after DB reset or whenever branch-scoped staff login starts failing again |

## 8. Handoff Note For Next Session

- First task: fix the outside-window check-in FE banner so `/i/1/reservations` shows the expected friendly `Chưa tới khung giờ check-in...` copy instead of the generic conflict message.
- Second task: fix `/i/1/tables` live-detail session/cart lookup so a real POS-opened table like A11 no longer says `Bàn chưa có phiên...` after `Gọi món`.
- After those fixes, rerun:
  1. `/i/1/reservations` with `RSV130021A9B` for the outside-window conflict path and `RSV09B7D6C2D`-style in-window success path.
  2. `/i/1/tables` → search `A11` → `Gọi món` → add item → `Chi tiết`.
- Keep `/api/v1/metrics` as a documented env-scoped contract exception unless the contracts package is extended to encode environment-dependent visibility.
- Do not mark PR-18 or PR-07 fully done until the two reproduced FE runtime gaps are fixed and rerun successfully.
