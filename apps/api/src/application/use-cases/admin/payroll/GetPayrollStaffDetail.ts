import type { IPayrollRepository } from "../../../ports/repositories/IPayrollRepository.js";

export class GetPayrollStaffDetail {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    staffId: string;
    month: string;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const branchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId ?? "");
    if (!branchId) throw new Error("BRANCH_SCOPE_REQUIRED");

    return this.payrollRepo.getStaffDetail({
      branchId,
      staffId: input.staffId,
      month: input.month,
    });
  }
}
