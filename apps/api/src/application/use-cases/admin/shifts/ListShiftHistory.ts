import type { IShiftRepository } from "../../../ports/repositories/IShiftRepository.js";

export class ListShiftHistory {
  constructor(private readonly shiftRepo: IShiftRepository) {}

  async execute(input: { branchId: string; limit?: number | null }) {
    const branchId = String(input.branchId ?? "").trim();
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    return this.shiftRepo.listHistory({
      branchId,
      limit: input.limit ?? 20,
    });
  }
}
