import type { IPayrollRepository } from "../../../ports/repositories/IPayrollRepository.js";

export class ListPayrollSummary {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    month: string;
    q?: string | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const branchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId ?? "");
    if (!branchId) throw new Error("BRANCH_SCOPE_REQUIRED");

    return this.payrollRepo.listSummary({
      branchId,
      month: input.month,
      q: input.q ?? null,
    });
  }
}
