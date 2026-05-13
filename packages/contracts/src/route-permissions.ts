import type { InternalPermission } from "./rbac";

export const routePermissions = {
  // Public / authless endpoints.
  // Empty arrays = "no internal permission required".
  "/api/v1/health": [],
  "/api/v1/admin/login": [],
  "/api/v1/client/otp/request": [],
  "/api/v1/client/otp/verify": [],
  "/api/v1/client/refresh": [],
  "/api/v1/client/logout": [],
  "/api/v1/menu/categories": [],
  "/api/v1/menu/items": [],
  "/api/v1/menu/items/:itemId": [],
  "/api/v1/menu/items/:itemId/combo": [],
  "/api/v1/menu/items/:itemId/meat-profile": [],
  "/api/v1/tables": [],
  "/api/v1/tables/:directionId": [],
  "/api/v1/sessions/open": [],
  "/api/v1/sessions/:sessionKey/close": [],
  "/api/v1/carts/session/:sessionKey": [],
  "/api/v1/carts/:cartKey": [],
  "/api/v1/carts/:cartKey/items": [],
  "/api/v1/carts/:cartKey/items/:itemId": [],
  "/api/v1/carts/:cartKey/voucher": [],
  "/api/v1/orders/from-cart/:cartKey": [],
  "/api/v1/orders/:orderCode/status": [],
  "/api/v1/payments/vnpay/create/:orderCode": [],
  "/api/v1/payments/vnpay/return": [],
  "/api/v1/payments/vnpay/ipn": [],
  "/api/v1/vouchers": [],
  "/api/v1/realtime/snapshot": [],
  "/api/v1/realtime/resync": [],
  "/api/v1/reservations/availability": [],
  "/api/v1/reservations": [],
  "/api/v1/reservations/:reservationCode": [],
  "/api/v1/reservations/:reservationCode/cancel": [],

  // Admin menu endpoints.
  "/api/v1/admin/menu/categories": ["menu.manage"],
  "/api/v1/admin/menu/categories/:categoryId": ["menu.manage"],
  "/api/v1/admin/menu/items": ["menu.manage"],
  "/api/v1/admin/menu/items/:itemId": ["menu.manage"],
  "/api/v1/admin/menu/items/:itemId/active": ["menu.manage"],
  "/api/v1/admin/menu/items/:itemId/recipe": ["menu.manage"],

  // Admin voucher endpoints.
  "/api/v1/admin/vouchers": ["promotions.manage"],
  "/api/v1/admin/vouchers/:voucherId": ["promotions.manage"],
  "/api/v1/admin/vouchers/:voucherId/active": ["promotions.manage"],

  "/api/v1/admin/dashboard/overview": ["observability.metrics.read"],

  "/api/v1/admin/shifts/current": ["shifts.read"],
  "/api/v1/admin/shifts/history": ["shifts.read"],
  "/api/v1/admin/shifts/:branchId/open": ["shifts.open"],
  "/api/v1/admin/shifts/:shiftRunId/close": ["shifts.close"],

  // Path-keyed contract note:
  // if different methods on the same path use different guards, list every
  // backend permission currently used on that path.
  "/api/v1/admin/attendance": ["attendance.read"],
  "/api/v1/admin/attendance/assignments": ["attendance.read", "attendance.manage"],
  "/api/v1/admin/attendance/assignments/:shiftCode": ["attendance.manage"],
  "/api/v1/admin/attendance/staff/:staffId/history": ["attendance.read"],
  "/api/v1/admin/attendance/:staffId/check-in": ["attendance.manage"],
  "/api/v1/admin/attendance/:attendanceId/check-out": ["attendance.manage"],
  "/api/v1/admin/attendance/:staffId/mark-absent": ["attendance.manage"],

  "/api/v1/admin/payroll/summary": ["payroll.read"],
  "/api/v1/admin/payroll/staff/:staffId": ["payroll.read"],
  "/api/v1/admin/payroll/profiles/:staffId": ["payroll.manage"],
  "/api/v1/admin/payroll/staff/:staffId/bonuses": ["payroll.bonus.manage"],
  "/api/v1/admin/payroll/bonuses/:payrollBonusId": ["payroll.bonus.manage"],
  "/api/v1/admin/payroll/bonuses/:payrollBonusId/void": ["payroll.bonus.manage"],

  "/api/v1/admin/staff": ["staff.read", "staff.manage"],
  "/api/v1/admin/staff/:staffId/role": ["staff.manage"],
  "/api/v1/admin/staff/:staffId/status": ["staff.manage"],
  "/api/v1/admin/staff/:staffId/reset-password": ["staff.manage"],

  "/api/v1/admin/tables": ["ops.tables.manage"],
  "/api/v1/admin/tables/:tableId": ["ops.tables.manage"],

  "/api/v1/admin/ops/tables": ["ops.tables.read"],
  "/api/v1/admin/ops/sessions/open": ["ops.sessions.open"],
  "/api/v1/admin/ops/sessions/:sessionKey/close": ["ops.sessions.close"],
  "/api/v1/admin/ops/carts/session/:sessionKey": ["ops.carts.get"],
  "/api/v1/admin/ops/carts/:cartKey": ["ops.carts.get"],
  "/api/v1/admin/ops/carts/:cartKey/items": ["ops.carts.items.upsert"],
  "/api/v1/admin/ops/carts/:cartKey/items/:itemId": ["ops.carts.items.upsert"],
  "/api/v1/admin/ops/orders/from-cart/:cartKey": ["ops.orders.create"],
  "/api/v1/admin/ops/orders/:orderCode/status": ["ops.tables.read"],

  "/api/v1/admin/kitchen/queue": ["kitchen.queue.read"],

  "/api/v1/admin/orders": ["orders.read"],
  "/api/v1/admin/orders/:orderCode/status": ["orders.status.change"],
  "/api/v1/admin/:orderCode(ORD[0-9A-F]{10})/status": ["orders.status.change"],

  "/api/v1/admin/cashier/unpaid": ["cashier.unpaid.read"],
  "/api/v1/admin/cashier/settle-cash/:orderCode": ["cashier.settle_cash"],
  "/api/v1/admin/payments/mock-success/:orderCode": ["payments.mock_success"],

  "/api/v1/admin/inventory/stock": ["inventory.read"],
  "/api/v1/admin/inventory/holds": ["inventory.holds.read"],
  "/api/v1/admin/inventory/adjustments": ["inventory.adjust"],
  "/api/v1/admin/inventory/stock/adjust": ["inventory.adjust"],
  "/api/v1/admin/inventory/rehydrate/metrics": ["inventory.read"],
  "/api/v1/admin/inventory/rehydrate/run": ["inventory.adjust"],
  "/api/v1/admin/inventory/menu/bump": ["menu.manage"],
  "/api/v1/admin/inventory/items": ["inventory.read", "inventory.adjust"],
  "/api/v1/admin/inventory/items/:ingredientId": ["inventory.adjust"],
  "/api/v1/admin/inventory/items/:ingredientId/adjust": ["inventory.adjust"],
  "/api/v1/admin/inventory/alerts": ["inventory.read"],

  "/api/v1/admin/maintenance/run": ["maintenance.run"],
  "/api/v1/admin/maintenance/sync-table-status": ["maintenance.run"],
  "/api/v1/admin/maintenance/reset-dev-state": ["maintenance.run"],
  "/api/v1/admin/maintenance/dev/set-stock": ["maintenance.run"],

  "/api/v1/admin/observability/slow-queries": ["observability.admin.read"],
  "/api/v1/admin/observability/logs": ["observability.admin.read"],

  "/api/v1/admin/realtime/audit": ["realtime.admin"],
  "/api/v1/admin/realtime/replay": ["realtime.admin"],

  "/api/v1/admin/reservations": ["reservations.confirm"],
  "/api/v1/admin/reservations/:reservationCode/confirm": ["reservations.confirm"],
  "/api/v1/admin/reservations/:reservationCode/checkin": ["reservations.checkin"],
} as const satisfies Record<string, readonly InternalPermission[]>;
