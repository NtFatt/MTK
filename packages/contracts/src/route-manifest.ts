export const routeManifest = {
  health: {
    method: "GET",
    path: "/api/v1/health",
  },

  adminLogin: {
    method: "POST",
    path: "/api/v1/admin/login",
  },

  clientOtpRequest: {
    method: "POST",
    path: "/api/v1/client/otp/request",
  },

  clientOtpVerify: {
    method: "POST",
    path: "/api/v1/client/otp/verify",
  },

  clientRefresh: {
    method: "POST",
    path: "/api/v1/client/refresh",
  },

  clientLogout: {
    method: "POST",
    path: "/api/v1/client/logout",
  },

  menuCategories: {
    method: "GET",
    path: "/api/v1/menu/categories",
  },

  menuItems: {
    method: "GET",
    path: "/api/v1/menu/items",
  },

  menuItemDetail: {
    method: "GET",
    path: "/api/v1/menu/items/:itemId",
  },

  menuItemCombo: {
    method: "GET",
    path: "/api/v1/menu/items/:itemId/combo",
  },

  menuItemMeatProfile: {
    method: "GET",
    path: "/api/v1/menu/items/:itemId/meat-profile",
  },

  tablesList: {
    method: "GET",
    path: "/api/v1/tables",
  },

  tablesByDirection: {
    method: "GET",
    path: "/api/v1/tables/:directionId",
  },

  sessionsOpen: {
    method: "POST",
    path: "/api/v1/sessions/open",
  },

  sessionsClose: {
    method: "POST",
    path: "/api/v1/sessions/:sessionKey/close",
  },

  cartBySession: {
    method: "POST",
    path: "/api/v1/carts/session/:sessionKey",
  },

  cartDetail: {
    method: "GET",
    path: "/api/v1/carts/:cartKey",
  },

  cartItemsUpsert: {
    method: "PUT",
    path: "/api/v1/carts/:cartKey/items",
  },

  cartItemRemove: {
    method: "DELETE",
    path: "/api/v1/carts/:cartKey/items/:itemId",
  },

  cartVoucherApply: {
    method: "PUT",
    path: "/api/v1/carts/:cartKey/voucher",
  },

  cartVoucherRemove: {
    method: "DELETE",
    path: "/api/v1/carts/:cartKey/voucher",
  },

  orderFromCart: {
    method: "POST",
    path: "/api/v1/orders/from-cart/:cartKey",
  },

  orderStatus: {
    method: "GET",
    path: "/api/v1/orders/:orderCode/status",
  },

  paymentVnpayCreate: {
    method: "POST",
    path: "/api/v1/payments/vnpay/create/:orderCode",
  },

  paymentVnpayReturn: {
    method: "GET",
    path: "/api/v1/payments/vnpay/return",
  },

  paymentVnpayIpn: {
    method: "GET",
    path: "/api/v1/payments/vnpay/ipn",
  },

  publicVouchers: {
    method: "GET",
    path: "/api/v1/vouchers",
  },

  realtimeSnapshot: {
    method: "GET",
    path: "/api/v1/realtime/snapshot",
  },

  realtimeResync: {
    method: "POST",
    path: "/api/v1/realtime/resync",
  },

  // Reservations (public / customer-facing)
  reservationAvailability: {
    method: "GET",
    path: "/api/v1/reservations/availability",
  },

  reservationCreate: {
    method: "POST",
    path: "/api/v1/reservations",
  },

  reservationGet: {
    method: "GET",
    path: "/api/v1/reservations/:reservationCode",
  },

  reservationCancel: {
    method: "POST",
    path: "/api/v1/reservations/:reservationCode/cancel",
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

  adminAttendanceAssignments: {
    method: "GET",
    path: "/api/v1/admin/attendance/assignments",
  },

  adminAttendanceStaffHistory: {
    method: "GET",
    path: "/api/v1/admin/attendance/staff/:staffId/history",
  },

  adminAttendanceAssignmentsReplace: {
    method: "PUT",
    path: "/api/v1/admin/attendance/assignments/:shiftCode",
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

  adminMenuItemRecipeGet: {
    method: "GET",
    path: "/api/v1/admin/menu/items/:itemId/recipe",
  },

  adminMenuItemRecipeSave: {
    method: "PUT",
    path: "/api/v1/admin/menu/items/:itemId/recipe",
  },

  adminVoucherList: {
    method: "GET",
    path: "/api/v1/admin/vouchers",
  },

  adminVoucherCreate: {
    method: "POST",
    path: "/api/v1/admin/vouchers",
  },

  adminVoucherUpdate: {
    method: "PATCH",
    path: "/api/v1/admin/vouchers/:voucherId",
  },

  adminVoucherSetActive: {
    method: "PATCH",
    path: "/api/v1/admin/vouchers/:voucherId/active",
  },

  adminStaffList: {
    method: "GET",
    path: "/api/v1/admin/staff",
  },

  adminStaffCreate: {
    method: "POST",
    path: "/api/v1/admin/staff",
  },

  adminStaffUpdateRole: {
    method: "PATCH",
    path: "/api/v1/admin/staff/:staffId/role",
  },

  adminStaffUpdateStatus: {
    method: "PATCH",
    path: "/api/v1/admin/staff/:staffId/status",
  },

  adminStaffResetPassword: {
    method: "POST",
    path: "/api/v1/admin/staff/:staffId/reset-password",
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

  opsTables: {
    method: "GET",
    path: "/api/v1/admin/ops/tables",
  },

  opsSessionsOpen: {
    method: "POST",
    path: "/api/v1/admin/ops/sessions/open",
  },

  opsSessionsClose: {
    method: "POST",
    path: "/api/v1/admin/ops/sessions/:sessionKey/close",
  },

  opsCartBySession: {
    method: "POST",
    path: "/api/v1/admin/ops/carts/session/:sessionKey",
  },

  opsCartDetail: {
    method: "GET",
    path: "/api/v1/admin/ops/carts/:cartKey",
  },

  opsCartItemsUpsert: {
    method: "PUT",
    path: "/api/v1/admin/ops/carts/:cartKey/items",
  },

  opsCartItemRemove: {
    method: "DELETE",
    path: "/api/v1/admin/ops/carts/:cartKey/items/:itemId",
  },

  opsOrderFromCart: {
    method: "POST",
    path: "/api/v1/admin/ops/orders/from-cart/:cartKey",
  },

  opsOrderStatus: {
    method: "GET",
    path: "/api/v1/admin/ops/orders/:orderCode/status",
  },

  kitchenQueue: {
    method: "GET",
    path: "/api/v1/admin/kitchen/queue",
  },

  adminOrders: {
    method: "GET",
    path: "/api/v1/admin/orders",
  },

  adminOrderStatusChange: {
    method: "POST",
    path: "/api/v1/admin/orders/:orderCode/status",
  },

  adminOrderStatusChangeCompat: {
    method: "POST",
    path: "/api/v1/admin/:orderCode(ORD[0-9A-F]{10})/status",
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

  inventoryHolds: {
    method: "GET",
    path: "/api/v1/admin/inventory/holds",
  },

  inventoryAdjustments: {
    method: "GET",
    path: "/api/v1/admin/inventory/adjustments",
  },

  inventoryAdjust: {
    method: "POST",
    path: "/api/v1/admin/inventory/stock/adjust",
  },

  inventoryRehydrateMetrics: {
    method: "GET",
    path: "/api/v1/admin/inventory/rehydrate/metrics",
  },

  inventoryRehydrateRun: {
    method: "POST",
    path: "/api/v1/admin/inventory/rehydrate/run",
  },

  inventoryMenuBump: {
    method: "POST",
    path: "/api/v1/admin/inventory/menu/bump",
  },

  inventoryItems: {
    method: "GET",
    path: "/api/v1/admin/inventory/items",
  },

  inventoryItemCreate: {
    method: "POST",
    path: "/api/v1/admin/inventory/items",
  },

  inventoryItemUpdate: {
    method: "PATCH",
    path: "/api/v1/admin/inventory/items/:ingredientId",
  },

  inventoryItemAdjust: {
    method: "POST",
    path: "/api/v1/admin/inventory/items/:ingredientId/adjust",
  },

  inventoryAlerts: {
    method: "GET",
    path: "/api/v1/admin/inventory/alerts",
  },

  adminReservationList: {
    method: "GET",
    path: "/api/v1/admin/reservations",
  },

  adminReservationConfirm: {
    method: "PATCH",
    path: "/api/v1/admin/reservations/:reservationCode/confirm",
  },

  adminReservationConfirmCompat: {
    method: "POST",
    path: "/api/v1/admin/reservations/:reservationCode/confirm",
  },

  adminReservationCheckin: {
    method: "POST",
    path: "/api/v1/admin/reservations/:reservationCode/checkin",
  },

  adminMaintenanceRun: {
    method: "POST",
    path: "/api/v1/admin/maintenance/run",
  },

  adminMaintenanceSyncTableStatus: {
    method: "POST",
    path: "/api/v1/admin/maintenance/sync-table-status",
  },

  adminMaintenanceResetDevState: {
    method: "POST",
    path: "/api/v1/admin/maintenance/reset-dev-state",
  },

  adminMaintenanceSetDevStock: {
    method: "POST",
    path: "/api/v1/admin/maintenance/dev/set-stock",
  },

  adminObservabilitySlowQueries: {
    method: "GET",
    path: "/api/v1/admin/observability/slow-queries",
  },

  adminObservabilityLogs: {
    method: "GET",
    path: "/api/v1/admin/observability/logs",
  },

  adminRealtimeAudit: {
    method: "GET",
    path: "/api/v1/admin/realtime/audit",
  },

  adminRealtimeReplay: {
    method: "GET",
    path: "/api/v1/admin/realtime/replay",
  },
} as const;
