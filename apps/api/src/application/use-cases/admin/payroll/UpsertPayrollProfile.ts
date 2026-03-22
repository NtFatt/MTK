import type { IPayrollRepository, PayrollSalaryMode } from "../../../ports/repositories/IPayrollRepository.js";
import type { IStaffUserRepository } from "../../../ports/repositories/IStaffUserRepository.js";

export class UpsertPayrollProfile {
  constructor(
    private readonly payrollRepo: IPayrollRepository,
    private readonly staffRepo: IStaffUserRepository,
  ) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    staffId: string;
    salaryMode: PayrollSalaryMode;
    baseMonthlyAmount: number;
    hourlyRateAmount: number;
    shiftRateMorning: number;
    shiftRateEvening: number;
    latePenaltyPerMinute: number;
    earlyLeavePenaltyPerMinute: number;
    absencePenaltyAmount: number;
    isActive: boolean;
    note?: string | null;
    expectedVersion?: number | null;
  }) {
    const branchId = String(input.branchId ?? "").trim();
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const staff = await this.staffRepo.findById(input.staffId);
    if (!staff) throw new Error("STAFF_NOT_FOUND");
    if (String(staff.branchId ?? "") !== branchId) throw new Error("FORBIDDEN");

    const amounts = [
      input.baseMonthlyAmount,
      input.hourlyRateAmount,
      input.shiftRateMorning,
      input.shiftRateEvening,
      input.latePenaltyPerMinute,
      input.earlyLeavePenaltyPerMinute,
      input.absencePenaltyAmount,
    ];
    if (amounts.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) {
      throw new Error("PAYROLL_AMOUNT_INVALID");
    }

    return this.payrollRepo.upsertProfile({
      branchId,
      staffId: input.staffId,
      salaryMode: input.salaryMode,
      baseMonthlyAmount: input.baseMonthlyAmount,
      hourlyRateAmount: input.hourlyRateAmount,
      shiftRateMorning: input.shiftRateMorning,
      shiftRateEvening: input.shiftRateEvening,
      latePenaltyPerMinute: input.latePenaltyPerMinute,
      earlyLeavePenaltyPerMinute: input.earlyLeavePenaltyPerMinute,
      absencePenaltyAmount: input.absencePenaltyAmount,
      isActive: input.isActive,
      note: input.note ?? null,
      expectedVersion: input.expectedVersion ?? null,
    });
  }
}
