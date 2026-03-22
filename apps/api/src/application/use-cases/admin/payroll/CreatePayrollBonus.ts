import type {
  IPayrollRepository,
  PayrollBonusType,
} from "../../../ports/repositories/IPayrollRepository.js";
import type { IStaffUserRepository } from "../../../ports/repositories/IStaffUserRepository.js";

export class CreatePayrollBonus {
  constructor(
    private readonly payrollRepo: IPayrollRepository,
    private readonly staffRepo: IStaffUserRepository,
  ) {}

  async execute(input: {
    actor: {
      actorType: "ADMIN" | "STAFF";
      role: string;
      branchId: string | null;
      userId: string;
    };
    branchId: string;
    staffId: string;
    businessDate: string;
    bonusType: PayrollBonusType;
    amount: number;
    note: string;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const branchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId ?? "");
    if (!branchId) throw new Error("BRANCH_SCOPE_REQUIRED");

    const staff = await this.staffRepo.findById(input.staffId);
    if (!staff) throw new Error("STAFF_NOT_FOUND");
    if (String(staff.branchId ?? "") !== branchId) throw new Error("FORBIDDEN");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.businessDate ?? "").trim())) {
      throw new Error("PAYROLL_BUSINESS_DATE_INVALID");
    }
    if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) {
      throw new Error("PAYROLL_AMOUNT_INVALID");
    }
    if (!String(input.note ?? "").trim()) throw new Error("PAYROLL_BONUS_NOTE_REQUIRED");

    return this.payrollRepo.createBonus({
      branchId,
      staffId: input.staffId,
      businessDate: input.businessDate,
      bonusType: input.bonusType,
      amount: input.amount,
      note: input.note,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
      },
    });
  }
}
