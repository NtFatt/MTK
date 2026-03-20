import type { IVoucherRepository } from "../../../ports/repositories/IVoucherRepository.js";

export class ListBranchVouchers {
  constructor(private readonly voucherRepo: IVoucherRepository) {}

  async execute(input: {
    branchId: string;
    q?: string | null;
    includeInactive?: boolean;
  }) {
    return this.voucherRepo.listByBranch({
      branchId: input.branchId,
      q: input.q ?? null,
      includeInactive: input.includeInactive ?? true,
    });
  }
}
