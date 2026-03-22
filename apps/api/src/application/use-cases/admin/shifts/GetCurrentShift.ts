import type { IShiftRepository } from "../../../ports/repositories/IShiftRepository.js";

export class GetCurrentShift {
  constructor(private readonly shiftRepo: IShiftRepository) {}

  async execute(input: { branchId: string }) {
    const branchId = String(input.branchId ?? "").trim();
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const [current, templates] = await Promise.all([
      this.shiftRepo.getCurrent(branchId),
      this.shiftRepo.listTemplates(branchId),
    ]);

    return { current, templates };
  }
}
