/**
 * queryKeys.ts
 *
 * Quy tắc:
 * - Key luôn là tuple readonly (as const)
 * - Domain-first: ["menu", "items", "list", {filters}]
 * - Không hardcode string rải rác trong codebase.
 */

export type QK = readonly unknown[];

export const qk = {
  health: () => ["health"] as const,
  version: () => ["version"] as const,

  auth: {
    me: () => ["auth", "me"] as const,
    otp: {
      request: () => ["auth", "otp", "request"] as const,
      verify: () => ["auth", "otp", "verify"] as const,
    },
    adminLogin: () => ["auth", "adminLogin"] as const,
  },

  branches: {
    list: (params?: { q?: string; page?: number; size?: number }) =>
      ["branches", "list", params ?? {}] as const,
    detail: (branchId: string | number) => ["branches", "detail", branchId] as const,
  },

  tables: {
    list: (params: { branchId?: string | number; directionId?: string; status?: string } = {}) =>
      ["tables", "list", params] as const,
  },

  menu: {
    categories: (params: { branchId?: string | number } = {}) =>
      ["menu", "categories", params] as const,
    items: (params: {
      branchId?: string | number;
      categoryId?: string | number;
      q?: string;
      page?: number;
      size?: number;
    } = {}) => ["menu", "items", "list", params] as const,
    itemDetail: (itemId: string | number) => ["menu", "items", "detail", itemId] as const,
    itemCombo: (itemId: string | number) => ["menu", "items", "combo", itemId] as const,
    itemMeatProfile: (itemId: string | number) => ["menu", "items", "meatProfile", itemId] as const,
  },

  sessions: {
    open: (params: { branchId?: string | number } = {}) => ["sessions", "open", params] as const,
    detail: (sessionKey: string) => ["sessions", "detail", sessionKey] as const,
  },

  cart: {
    byCartKey: (cartKey: string) => ["cart", "detail", cartKey] as const,
    bySessionKey: (sessionKey: string) => ["cart", "bySession", sessionKey] as const,
  },

  orders: {
    byCode: (orderCode: string) => ["orders", "detail", orderCode] as const,
    status: (orderCode: string) => ["orders", "status", orderCode] as const,

    // Internal
    kitchenQueue: (params: { branchId?: string | number } = {}) =>
      ["orders", "kitchen", "queue", params] as const,
    cashierUnpaid: (params: { branchId?: string | number } = {}) =>
      ["orders", "cashier", "unpaid", params] as const,
  },

  inventory: {
    stock: (params: { branchId?: string | number } = {}) => ["inventory", "stock", params] as const,
    holds: (params: { branchId?: string | number } = {}) => ["inventory", "holds", params] as const,
    rehydrateMetrics: (params: { branchId?: string | number } = {}) =>
      ["inventory", "rehydrate", "metrics", params] as const,
  },

  reservations: {
    list: (params: { branchId?: string | number; status?: string; q?: string } = {}) =>
      ["reservations", "list", params] as const,
  },

  realtime: {
    snapshot: (params: { branchId?: string | number; sinceSeq?: number } = {}) =>
      ["realtime", "snapshot", params] as const,
    audit: (params: { branchId?: string | number; sinceSeq?: number } = {}) =>
      ["realtime", "audit", params] as const,
  },
} as const;
