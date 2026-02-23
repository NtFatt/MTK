/**
 * queryKeys.ts
 *
 * Quy tắc:
 * - Key luôn là tuple readonly (as const)
 * - Domain-first: ["menu", "items", "list", {filters}]
 * - Không hardcode string rải rác trong codebase.
 */

export type QK = readonly unknown[];

function normalizeBranchId<T extends { branchId?: string | number }>(params: T): T & { branchId?: string } {
  return {
    ...params,
    branchId: params.branchId != null ? String(params.branchId) : undefined,
  };
}

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
    detail: (branchId: string | number) => ["branches", "detail", String(branchId)] as const,
  },

  tables: {
    list: (params: { branchId?: string | number; directionId?: string; status?: string } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["tables", "list", normalized] as const;
    },
  },

  // Internal ops tables (admin/ops)
  ops: {
    tables: {
      list: (params: { branchId?: string | number } = {}) => {
        const normalized = normalizeBranchId(params);
        return ["ops", "tables", "list", normalized] as const;
      },
    },
  },

  menu: {
    categories: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["menu", "categories", normalized] as const;
    },
    items: (params: {
      branchId?: string | number;
      categoryId?: string | number;
      q?: string;
      page?: number;
      size?: number;
    } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["menu", "items", "list", normalized] as const;
    },
    itemDetail: (itemId: string | number) => ["menu", "items", "detail", String(itemId)] as const,
    itemCombo: (itemId: string | number) => ["menu", "items", "combo", String(itemId)] as const,
    itemMeatProfile: (itemId: string | number) => ["menu", "items", "meatProfile", String(itemId)] as const,
  },

  sessions: {
    open: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["sessions", "open", normalized] as const;
    },
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
    kitchenQueue: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["orders", "kitchen", "queue", normalized] as const;
    },
    cashierUnpaid: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["orders", "cashier", "unpaid", normalized] as const;
    },
  },

  inventory: {
    stock: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["inventory", "stock", normalized] as const;
    },
    holds: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["inventory", "holds", normalized] as const;
    },
    rehydrateMetrics: (params: { branchId?: string | number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["inventory", "rehydrate", "metrics", normalized] as const;
    },
  },

  reservations: {
    list: (params: { branchId?: string | number; status?: string; q?: string } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["reservations", "list", normalized] as const;
    },
  },

  realtime: {
    snapshot: (params: { branchId?: string | number; sinceSeq?: number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["realtime", "snapshot", normalized] as const;
    },
    audit: (params: { branchId?: string | number; sinceSeq?: number } = {}) => {
      const normalized = normalizeBranchId(params);
      return ["realtime", "audit", normalized] as const;
    },
  },
} as const;