import type { IPayrollRepository } from "../../../ports/repositories/IPayrollRepository.js";

export class VoidPayrollBonus {
  constructor(private readonly payrollRepo: IPayrollRepository) {}

  async execute(input: {
    actor: {
      actorType: "ADMIN" | "STAFF";
      role: string;
      branchId: string | null;
      userId: string;
    };
    payrollBonusId: string;
    branchId: string;
    reason: string;
    expectedVersion?: number | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const branchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId ?? "");
    if (!branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
    if (!String(input.reason ?? "").trim()) throw new Error("PAYROLL_VOID_REASON_REQUIRED");

    return this.payrollRepo.voidBonus({
      payrollBonusId: input.payrollBonusId,
      branchId,
      reason: input.reason,
      expectedVersion: input.expectedVersion ?? null,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
      },
    });
  }
}
