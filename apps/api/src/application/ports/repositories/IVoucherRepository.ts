import type { VoucherDiscountType } from "../../../domain/policies/voucherPricing.js";

export type VoucherRecord = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minSubtotal: number;
  usageLimitTotal: number | null;
  usageLimitPerSession: number | null;
  usageCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VoucherUsageSnapshot = {
  voucherId: string;
  branchId: string;
  orderId: string;
  sessionId: string | null;
  voucherCodeSnapshot: string;
  voucherNameSnapshot: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  discountAmount: number;
  subtotalAmount: number;
  totalAfterDiscount: number;
};

export interface IVoucherRepository {
  listByBranch(input: {
    branchId: string;
    q?: string | null;
    includeInactive?: boolean;
  }): Promise<VoucherRecord[]>;

  listPublicByBranch(branchId: string): Promise<VoucherRecord[]>;

  findById(
    voucherId: string,
    options?: { conn?: any; forUpdate?: boolean },
  ): Promise<VoucherRecord | null>;

  findByCodeForBranch(
    branchId: string,
    code: string,
    options?: { conn?: any; forUpdate?: boolean },
  ): Promise<VoucherRecord | null>;

  create(input: {
    branchId: string;
    code: string;
    name: string;
    description: string | null;
    discountType: VoucherDiscountType;
    discountValue: number;
    maxDiscountAmount: number | null;
    minSubtotal: number;
    usageLimitTotal: number | null;
    usageLimitPerSession: number | null;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
  }): Promise<VoucherRecord>;

  update(input: {
    voucherId: string;
    branchId: string;
    code?: string;
    name?: string;
    description?: string | null;
    discountType?: VoucherDiscountType;
    discountValue?: number;
    maxDiscountAmount?: number | null;
    minSubtotal?: number;
    usageLimitTotal?: number | null;
    usageLimitPerSession?: number | null;
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
  }): Promise<VoucherRecord>;

  setActive(input: {
    voucherId: string;
    branchId: string;
    isActive: boolean;
  }): Promise<VoucherRecord>;

  setCartVoucher(cartId: string, voucherId: string | null): Promise<void>;

  getCartVoucher(cartId: string, options?: { conn?: any }): Promise<VoucherRecord | null>;

  countUsagesForSession(
    voucherId: string,
    sessionId: string,
    options?: { conn?: any },
  ): Promise<number>;

  recordUsage(input: VoucherUsageSnapshot, options?: { conn?: any }): Promise<void>;

  reverseUsageForOrder(
    orderId: string,
    options?: { conn?: any },
  ): Promise<{
    reversed: boolean;
    voucherId: string | null;
  }>;
}
