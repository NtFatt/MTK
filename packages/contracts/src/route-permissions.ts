export const routePermissions = {
  "/api/v1/admin/menu/categories": ["menu.manage"],

  "/api/v1/admin/menu/categories/:categoryId": ["menu.manage"],

  "/api/v1/admin/menu/items": ["menu.manage"],

  "/api/v1/admin/menu/items/:itemId": ["menu.manage"],

  "/api/v1/admin/menu/items/:itemId/active": ["menu.manage"],

  "/api/v1/admin/vouchers": ["promotions.manage"],

  "/api/v1/admin/vouchers/:voucherId": ["promotions.manage"],

  "/api/v1/admin/vouchers/:voucherId/active": ["promotions.manage"],

  "/api/v1/admin/dashboard/overview": ["observability.metrics.read"],

  "/api/v1/admin/shifts/current": ["shifts.read"],

  "/api/v1/admin/shifts/history": ["shifts.read"],

  "/api/v1/admin/shifts/:branchId/open": ["shifts.open"],

  "/api/v1/admin/shifts/:shiftRunId/close": ["shifts.close"],

  "/api/v1/admin/attendance": ["attendance.read"],

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

  "/api/v1/admin/kitchen/queue": ["kitchen.queue.read"],

  "/api/v1/admin/orders": ["orders.read"],

  "/api/v1/admin/orders/:orderCode/status": ["orders.status.change"],

  "/api/v1/admin/cashier/unpaid": ["cashier.unpaid.read"],

  "/api/v1/admin/cashier/settle-cash/:orderCode": ["cashier.settle_cash"],

  "/api/v1/admin/payments/mock-success/:orderCode": ["payments.mock_success"],

  "/api/v1/admin/inventory/stock": ["inventory.read"],

  "/api/v1/admin/inventory/stock/adjust": ["inventory.adjust"],

  "/api/v1/admin/inventory/holds": ["inventory.holds.read"],

  "/api/v1/admin/inventory/menu/bump": ["menu.manage"],

  "/api/v1/admin/observability/slow-queries": ["observability.admin.read"],

  "/api/v1/admin/realtime/audit": ["realtime.admin"],
} as const;
