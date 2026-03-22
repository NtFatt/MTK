import type { StaffUserRole, StaffUserStatus } from "./IStaffUserRepository.js";

export type PayrollSalaryMode = "MONTHLY" | "HOURLY" | "SHIFT";
export type PayrollBonusType = "PERFORMANCE" | "ADJUSTMENT" | "OTHER";

export type PayrollProfileView = {
  payrollProfileId: string;
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
  note: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PayrollBonusEntryView = {
  payrollBonusId: string;
  branchId: string;
  staffId: string;
  businessDate: string;
  bonusType: PayrollBonusType;
  amount: number;
  note: string;
  isVoid: boolean;
  voidReason: string | null;
  createdByType: string;
  createdById: string;
  updatedByType: string | null;
  updatedById: string | null;
  voidedByType: string | null;
  voidedById: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PayrollAttendanceSummary = {
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  absentCount: number;
  attendedShiftCount: number;
  morningShiftCount: number;
  eveningShiftCount: number;
};

export type PayrollComputedTotals = {
  grossAmount: number;
  penaltyAmount: number;
  bonusAmount: number;
  estimatedNetAmount: number;
};

export type PayrollSummaryRow = {
  branchId: string;
  staffId: string;
  staffName: string | null;
  username: string;
  staffRole: StaffUserRole;
  staffStatus: StaffUserStatus;
  month: string;
  profile: PayrollProfileView | null;
  attendance: PayrollAttendanceSummary;
  totals: PayrollComputedTotals;
  updatedAt: string;
};

export type PayrollStaffDetailView = {
  summary: PayrollSummaryRow;
  bonuses: PayrollBonusEntryView[];
};

export interface IPayrollRepository {
  listSummary(input: {
    branchId: string;
    month: string;
    q?: string | null;
  }): Promise<PayrollSummaryRow[]>;

  getStaffDetail(input: {
    branchId: string;
    staffId: string;
    month: string;
  }): Promise<PayrollStaffDetailView | null>;

  upsertProfile(input: {
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
  }): Promise<PayrollProfileView>;

  createBonus(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    bonusType: PayrollBonusType;
    amount: number;
    note: string;
    actor: {
      actorType: "ADMIN" | "STAFF";
      actorId: string;
    };
  }): Promise<PayrollBonusEntryView>;

  updateBonus(input: {
    payrollBonusId: string;
    branchId: string;
    businessDate?: string;
    bonusType?: PayrollBonusType;
    amount?: number;
    note?: string;
    expectedVersion?: number | null;
    actor: {
      actorType: "ADMIN" | "STAFF";
      actorId: string;
    };
  }): Promise<PayrollBonusEntryView>;

  voidBonus(input: {
    payrollBonusId: string;
    branchId: string;
    reason: string;
    expectedVersion?: number | null;
    actor: {
      actorType: "ADMIN" | "STAFF";
      actorId: string;
    };
  }): Promise<PayrollBonusEntryView>;
}
