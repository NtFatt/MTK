export const routePermissions = {
  "/api/v1/admin/menu/categories": ["menu.manage"],

  "/api/v1/admin/menu/items": ["menu.manage"],

  "/api/v1/admin/menu/items/:itemId": ["menu.manage"],

  "/api/v1/admin/menu/items/:itemId/active": ["menu.manage"],

  "/api/v1/admin/vouchers": ["promotions.manage"],

  "/api/v1/admin/vouchers/:voucherId": ["promotions.manage"],

  "/api/v1/admin/vouchers/:voucherId/active": ["promotions.manage"],

  "/api/v1/admin/dashboard/overview": ["observability.metrics.read"],

  "/api/v1/admin/kitchen/queue": ["kitchen.queue.read"],

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
