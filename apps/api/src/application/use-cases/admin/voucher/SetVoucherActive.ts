import type { IVoucherRepository } from "../../../ports/repositories/IVoucherRepository.js";

export class SetVoucherActive {
  constructor(private readonly voucherRepo: IVoucherRepository) {}

  async execute(input: {
    voucherId: string;
    branchId: string;
    isActive: boolean;
  }) {
    return this.voucherRepo.setActive(input);
  }
}
