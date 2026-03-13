export const routeManifest = {
  health: {
    method: "GET",
    path: "/api/v1/health",
  },

  adminLogin: {
    method: "POST",
    path: "/api/v1/admin/login",
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

  kitchenQueue: {
    method: "GET",
    path: "/api/v1/admin/kitchen/queue",
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
