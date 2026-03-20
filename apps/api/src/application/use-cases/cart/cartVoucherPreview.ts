import type { IVoucherRepository, VoucherRecord } from "../../ports/repositories/IVoucherRepository.js";
import {
  calculateVoucherPricing,
  validateVoucherForSubtotal,
} from "../../../domain/policies/voucherPricing.js";

export type CartVoucherPreview = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount: number | null;
  minSubtotal: number;
  usageLimitTotal: number | null;
  usageLimitPerSession: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isValid: boolean;
  invalidReasonCode: string | null;
  invalidReasonMessage: string | null;
  discountAmount: number;
  totalAfterDiscount: number;
  effectivePercent: number;
};

export async function buildVoucherPreview(input: {
  voucher: VoucherRecord;
  subtotal: number;
  sessionId?: string | null;
  voucherRepo: IVoucherRepository;
}) {
  const sessionUsageCount =
    input.sessionId && input.voucher.usageLimitPerSession != null
      ? await input.voucherRepo.countUsagesForSession(input.voucher.id, input.sessionId)
      : 0;

  const validation = validateVoucherForSubtotal({
    voucher: input.voucher,
    subtotal: input.subtotal,
    sessionUsageCount,
  });

  const pricing = validation.ok
    ? calculateVoucherPricing({ subtotal: input.subtotal, voucher: input.voucher })
    : {
        discountAmount: 0,
        totalAfterDiscount: Math.max(0, input.subtotal),
        effectivePercent: 0,
      };

  const preview: CartVoucherPreview = {
    id: input.voucher.id,
    code: input.voucher.code,
    name: input.voucher.name,
    description: input.voucher.description,
    discountType: input.voucher.discountType,
    discountValue: input.voucher.discountValue,
    maxDiscountAmount: input.voucher.maxDiscountAmount,
    minSubtotal: input.voucher.minSubtotal,
    usageLimitTotal: input.voucher.usageLimitTotal,
    usageLimitPerSession: input.voucher.usageLimitPerSession,
    startsAt: input.voucher.startsAt,
    endsAt: input.voucher.endsAt,
    isActive: input.voucher.isActive,
    isValid: validation.ok,
    invalidReasonCode: validation.ok ? null : validation.code,
    invalidReasonMessage: validation.ok ? null : validation.message,
    discountAmount: pricing.discountAmount,
    totalAfterDiscount: pricing.totalAfterDiscount,
    effectivePercent: pricing.effectivePercent,
  };

  return preview;
}
