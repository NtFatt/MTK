import type { IVoucherRepository } from "../../../ports/repositories/IVoucherRepository.js";
import type { VoucherDiscountType } from "../../../../domain/policies/voucherPricing.js";

export class UpdateVoucher {
  constructor(private readonly voucherRepo: IVoucherRepository) {}

  async execute(input: {
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
  }) {
    return this.voucherRepo.update(input);
  }
}
