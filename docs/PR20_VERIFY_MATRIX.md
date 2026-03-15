## 2. Internal Route Inventory

| Route | Layout | Guard | Nav source | Status | Notes |
|---|---|---|---|---|---|
| `/i/login` | none | public | n/a | REVIEWED | internal login |
| `/i/logout` | none | public | n/a | REVIEWED | logout page |
| `/i/:branchId` | shell | `RequireAuth` | index redirect | REVIEWED | resolves home by permission |
| `/i/:branchId/tables` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | ops/tables |
| `/i/:branchId/kitchen` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | kitchen queue |
| `/i/:branchId/cashier` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | cashier unpaid |
| `/i/:branchId/reservations` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | reservations flow |
| `/i/:branchId/maintenance` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | maintenance action |
| `/i/:branchId/inventory/stock` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | inventory stock |
| `/i/:branchId/inventory/holds` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | inventory holds |
| `/i/:branchId/inventory/adjustments` | shell | `RequireAuth` | `InternalShellNav` | REVIEWED | inventory history |
| `/i/:branchId/admin` | admin | `RequireAuth + RequireAdmin` | index redirect / admin links | REVIEWED | redirects to dashboard |
| `/i/:branchId/admin/dashboard` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | admin dashboard |
| `/i/:branchId/admin/staff` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | staff management |
| `/i/:branchId/admin/tables` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | admin-access tables |
| `/i/:branchId/admin/kitchen` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | admin-access kitchen |
| `/i/:branchId/admin/cashier` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | admin-access cashier |
| `/i/:branchId/admin/reservations` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | admin-access reservations |
| `/i/:branchId/admin/maintenance` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | admin maintenance |
| `/i/:branchId/admin/observability` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | observability |
| `/i/:branchId/admin/realtime` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | realtime admin |
| `/i/:branchId/admin/inventory/stock` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | inventory stock |
| `/i/:branchId/admin/inventory/holds` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | inventory holds |
| `/i/:branchId/admin/inventory/adjustments` | admin | `RequireAuth + RequireAdmin` | `InternalSidebar` | REVIEWED | inventory history |
| `/i/pos/tables` | legacy-ish internal shortcut | `RequireAuth` | none | REVIEW NOW | check if still needed |
| `/i/pos/menu` | legacy-ish internal shortcut | `RequireAuth` | none | REVIEW NOW | check if still needed |
| `/i/admin/system` | redirect only | none | none | REVIEWED | redirects to missing_branch |

## 4. Batch 3 Manual Verify

| Case | Expected | Actual | Result | Note |
|---|---|---|---|---|
| T1 Tables load | list tables loads |  |  |  |
| T2 Branch mismatch | blocked, no data leak |  |  |  |
| T3 Tables -> POS menu | `/i/<branch>/pos/menu` |  |  |  |
| T4 POS -> Đổi bàn | `/i/<branch>/tables` |  |  |  |
| T5 POS without session | redirect to `/i/<branch>/tables` |  |  |  |
| K1 Kitchen load | queue loads |  |  |  |
| K2 Kitchen sees new order | order appears |  |  |  |
| K3 Kitchen status change | success + refresh |  |  |  |
| C1 Cashier unpaid load | list loads |  |  |  |
| C2 Cashier settle cash | success |  |  |  |
| C3 Cashier double submit | no duplicate settle |  |  |  |
| C4 Cashier forbidden | blocked correctly |  |  |  |

## 5. Remaining Module Verify

| Case | Expected | Actual | Result | Note |
|---|---|---|---|---|
| R1 Reservations load |  |  |  |  |
| R2 Reservation confirm |  |  |  |  |
| R3 Reservation check-in |  |  |  |  |
| R4 Reservation invalid transition |  |  |  |  |
| M1 Maintenance load |  |  |  |  |
| M2 Maintenance run success |  |  |  |  |
| M3 Maintenance forbidden role |  |  |  |  |
| O1 Observability load |  |  |  |  |
| O2 Observability refresh |  |  |  |  |
| O3 Observability sensitive data check |  |  |  |  |
| RT1 Realtime admin load |  |  |  |  |
| RT2 Realtime replay/refresh |  |  |  |  |
| RT3 Realtime invalid params handled |  |  |  |  |

| R1 Reservations load | list loads | ... | Pass | |
| R2 Reservation confirm | confirm works | ... | Pass | |
| R3 Reservation check-in | check-in works | ... | Pass | |
| R4 Reservation invalid transition | conflict handled cleanly | ... | Pass | |



| M1 Maintenance load | page loads | ... | Pass | |
| M2 Maintenance run success | run succeeds | ... | Pass | |
| M3 Maintenance forbidden role | blocked correctly | ... | Pass | |
| O1 Observability load | page loads | ... | Pass | |
| O2 Observability refresh | refresh works | ... | Pass | |
| O3 Observability sensitive data check | no obvious leak | ... | Pass | |
| RT1 Realtime admin load | feed loads | ... | Pass | |
| RT2 Realtime replay/refresh | controls work | ... | Pass | |
| RT3 Realtime invalid params handled | UI survives bad input | ... | Pass | |