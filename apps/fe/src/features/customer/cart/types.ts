/**
 * Cart types — aligned with @hadilao/contracts cart schema.
 */

export type CartItemOption = {
  key?: string;
  value?: string | number | boolean;
};

export type CartItem = {
  itemId: string | number;
  name?: string;
  qty: number;
  unitPrice?: number;
  note?: string;
  options?: CartItemOption[];
  itemOptions?: Record<string, unknown> | null;
  optionsHash?: string;
};

export type Cart = {
  cartKey: string;
  sessionKey?: string;
  branchId?: string | number;
  items: CartItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  voucher?: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    discountType: "PERCENT" | "FIXED_AMOUNT";
    discountValue: number;
    maxDiscountAmount?: number | null;
    minSubtotal: number;
    usageLimitTotal?: number | null;
    usageLimitPerSession?: number | null;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    isValid: boolean;
    invalidReasonCode?: string | null;
    invalidReasonMessage?: string | null;
    discountAmount: number;
    totalAfterDiscount: number;
    effectivePercent: number;
  } | null;
  openBill?: {
    orderId: string;
    orderCode: string;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    voucherCode?: string | null;
    voucherName?: string | null;
    voucherDiscountAmount?: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type UpsertCartItemsBody = {
  items: CartItem[];
};
