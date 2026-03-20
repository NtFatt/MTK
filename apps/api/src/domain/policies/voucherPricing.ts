export type VoucherDiscountType = "PERCENT" | "FIXED_AMOUNT";

export type VoucherLike = {
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
};

export type VoucherValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "VOUCHER_INACTIVE"
        | "VOUCHER_NOT_STARTED"
        | "VOUCHER_EXPIRED"
        | "VOUCHER_MIN_SUBTOTAL_NOT_REACHED"
        | "VOUCHER_USAGE_LIMIT_REACHED"
        | "VOUCHER_SESSION_LIMIT_REACHED";
      message: string;
    };

export type VoucherPricingPreview = {
  discountAmount: number;
  totalAfterDiscount: number;
  effectivePercent: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
}

export function validateVoucherForSubtotal(input: {
  voucher: VoucherLike;
  subtotal: number;
  now?: Date;
  sessionUsageCount?: number;
}): VoucherValidationResult {
  const { voucher, subtotal } = input;
  const nowTime = (input.now ?? new Date()).getTime();
  const startsAt = parseDate(voucher.startsAt);
  const endsAt = parseDate(voucher.endsAt);

  if (!voucher.isActive) {
    return { ok: false, code: "VOUCHER_INACTIVE", message: "Voucher hiện đang tạm ngưng." };
  }

  if (Number.isFinite(startsAt) && nowTime < startsAt) {
    return { ok: false, code: "VOUCHER_NOT_STARTED", message: "Voucher chưa đến thời gian áp dụng." };
  }

  if (Number.isFinite(endsAt) && nowTime > endsAt) {
    return { ok: false, code: "VOUCHER_EXPIRED", message: "Voucher đã hết hạn." };
  }

  if (subtotal < voucher.minSubtotal) {
    return {
      ok: false,
      code: "VOUCHER_MIN_SUBTOTAL_NOT_REACHED",
      message: `Đơn hàng chưa đạt mức tối thiểu ${roundMoney(voucher.minSubtotal).toLocaleString("vi-VN")}đ.`,
    };
  }

  if (
    voucher.usageLimitTotal != null &&
    Number.isFinite(voucher.usageLimitTotal) &&
    voucher.usageCount >= voucher.usageLimitTotal
  ) {
    return { ok: false, code: "VOUCHER_USAGE_LIMIT_REACHED", message: "Voucher đã hết lượt sử dụng." };
  }

  if (
    voucher.usageLimitPerSession != null &&
    Number.isFinite(voucher.usageLimitPerSession) &&
    (input.sessionUsageCount ?? 0) >= voucher.usageLimitPerSession
  ) {
    return {
      ok: false,
      code: "VOUCHER_SESSION_LIMIT_REACHED",
      message: "Phiên bàn này đã dùng hết lượt áp dụng cho voucher này.",
    };
  }

  return { ok: true };
}

export function calculateVoucherPricing(input: {
  subtotal: number;
  voucher: VoucherLike;
}): VoucherPricingPreview {
  const subtotal = roundMoney(Math.max(0, input.subtotal));
  if (subtotal <= 0) {
    return { discountAmount: 0, totalAfterDiscount: subtotal, effectivePercent: 0 };
  }

  const voucher = input.voucher;
  let discountAmount = 0;

  if (voucher.discountType === "PERCENT") {
    discountAmount = roundMoney((subtotal * voucher.discountValue) / 100);
  } else {
    discountAmount = roundMoney(voucher.discountValue);
  }

  if (voucher.maxDiscountAmount != null && Number.isFinite(voucher.maxDiscountAmount)) {
    discountAmount = Math.min(discountAmount, roundMoney(voucher.maxDiscountAmount));
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const totalAfterDiscount = roundMoney(Math.max(0, subtotal - discountAmount));
  const effectivePercent = subtotal > 0 ? roundMoney((discountAmount / subtotal) * 100) : 0;

  return {
    discountAmount,
    totalAfterDiscount,
    effectivePercent,
  };
}
