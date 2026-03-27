export const routeManifest = {
  health: {
    method: "GET",
    path: "/api/v1/health",
  },

  adminLogin: {
    method: "POST",
    path: "/api/v1/admin/login",
  },

  adminMenuCategories: {
    method: "GET",
    path: "/api/v1/admin/menu/categories",
  },

  adminMenuCategoryCreate: {
    method: "POST",
    path: "/api/v1/admin/menu/categories",
  },

  adminMenuCategoryUpdate: {
    method: "PUT",
    path: "/api/v1/admin/menu/categories/:categoryId",
  },

  adminMenuCategoryDelete: {
    method: "DELETE",
    path: "/api/v1/admin/menu/categories/:categoryId",
  },

  adminMenuItems: {
    method: "GET",
    path: "/api/v1/admin/menu/items",
  },

  adminMenuItemCreate: {
    method: "POST",
    path: "/api/v1/admin/menu/items",
  },

  adminMenuItemUpdate: {
    method: "PUT",
    path: "/api/v1/admin/menu/items/:itemId",
  },

  adminMenuItemSetActive: {
    method: "PATCH",
    path: "/api/v1/admin/menu/items/:itemId/active",
  },

  menuItems: {
    method: "GET",
    path: "/api/v1/menu/items",
  },

  cartBySession: {
    method: "POST",
    path: "/api/v1/carts/session/:sessionKey",
  },

  cartItemsUpsert: {
    method: "PUT",
    path: "/api/v1/carts/:cartKey/items",
  },

  orderFromCart: {
    method: "POST",
    path: "/api/v1/orders/from-cart/:cartKey",
  },

  orderStatus: {
    method: "GET",
    path: "/api/v1/orders/:orderCode/status",
  },

  opsTables: {
    method: "GET",
    path: "/api/v1/admin/ops/tables",
  },

  adminTableCreate: {
    method: "POST",
    path: "/api/v1/admin/tables",
  },

  adminTableUpdate: {
    method: "PUT",
    path: "/api/v1/admin/tables/:tableId",
  },

  adminTableDelete: {
    method: "DELETE",
    path: "/api/v1/admin/tables/:tableId",
  },

  adminDashboardOverview: {
    method: "GET",
    path: "/api/v1/admin/dashboard/overview",
  },

  adminCurrentShift: {
    method: "GET",
    path: "/api/v1/admin/shifts/current",
  },

  adminShiftHistory: {
    method: "GET",
    path: "/api/v1/admin/shifts/history",
  },

  adminShiftOpen: {
    method: "POST",
    path: "/api/v1/admin/shifts/:branchId/open",
  },

  adminShiftClose: {
    method: "POST",
    path: "/api/v1/admin/shifts/:shiftRunId/close",
  },

  adminAttendanceBoard: {
    method: "GET",
    path: "/api/v1/admin/attendance",
  },

  adminAttendanceStaffHistory: {
    method: "GET",
    path: "/api/v1/admin/attendance/staff/:staffId/history",
  },

  adminAttendanceCheckIn: {
    method: "POST",
    path: "/api/v1/admin/attendance/:staffId/check-in",
  },

  adminAttendanceCheckOut: {
    method: "POST",
    path: "/api/v1/admin/attendance/:attendanceId/check-out",
  },

  adminAttendanceMarkAbsent: {
    method: "POST",
    path: "/api/v1/admin/attendance/:staffId/mark-absent",
  },

  adminPayrollSummary: {
    method: "GET",
    path: "/api/v1/admin/payroll/summary",
  },

  adminPayrollStaffDetail: {
    method: "GET",
    path: "/api/v1/admin/payroll/staff/:staffId",
  },

  adminPayrollProfileUpsert: {
    method: "PUT",
    path: "/api/v1/admin/payroll/profiles/:staffId",
  },

  adminPayrollBonusCreate: {
    method: "POST",
    path: "/api/v1/admin/payroll/staff/:staffId/bonuses",
  },

  adminPayrollBonusUpdate: {
    method: "PATCH",
    path: "/api/v1/admin/payroll/bonuses/:payrollBonusId",
  },

  adminPayrollBonusVoid: {
    method: "POST",
    path: "/api/v1/admin/payroll/bonuses/:payrollBonusId/void",
  },

  kitchenQueue: {
    method: "GET",
    path: "/api/v1/admin/kitchen/queue",
  },

  adminOrders: {
    method: "GET",
    path: "/api/v1/admin/orders",
  },

  cashierUnpaid: {
    method: "GET",
    path: "/api/v1/admin/cashier/unpaid",
  },

  settleCash: {
    method: "POST",
    path: "/api/v1/admin/cashier/settle-cash/:orderCode",
  },

  mockSuccess: {
    method: "POST",
    path: "/api/v1/admin/payments/mock-success/:orderCode",
  },

  inventoryStock: {
    method: "GET",
    path: "/api/v1/admin/inventory/stock",
  },

  inventoryAdjust: {
    method: "POST",
    path: "/api/v1/admin/inventory/stock/adjust",
  },

  inventoryHolds: {
    method: "GET",
    path: "/api/v1/admin/inventory/holds",
  },

  realtimeSnapshot: {
    method: "GET",
    path: "/api/v1/realtime/snapshot",
  },
} as const;
