import type {
  IPayrollRepository,
  PayrollBonusType,
} from "../../../ports/repositories/IPayrollRepository.js";

export class UpdatePayrollBonus {
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
    businessDate?: string;
    bonusType?: PayrollBonusType;
    amount?: number;
    note?: string;
    expectedVersion?: number | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const branchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId ?? "");
    if (!branchId) throw new Error("BRANCH_SCOPE_REQUIRED");

    if (input.businessDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(input.businessDate).trim())) {
      throw new Error("PAYROLL_BUSINESS_DATE_INVALID");
    }
    if (input.amount != null && (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0)) {
      throw new Error("PAYROLL_AMOUNT_INVALID");
    }
    if (input.note != null && !String(input.note).trim()) throw new Error("PAYROLL_BONUS_NOTE_REQUIRED");

    return this.payrollRepo.updateBonus({
      payrollBonusId: input.payrollBonusId,
      branchId,
      ...(input.businessDate != null ? { businessDate: input.businessDate } : {}),
      ...(input.bonusType != null ? { bonusType: input.bonusType } : {}),
      ...(input.amount != null ? { amount: input.amount } : {}),
      ...(input.note != null ? { note: input.note } : {}),
      expectedVersion: input.expectedVersion ?? null,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
      },
    });
  }
}
