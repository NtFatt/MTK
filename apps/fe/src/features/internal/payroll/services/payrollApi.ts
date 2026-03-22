import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

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
  staffRole: string;
  staffStatus: string;
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

export type FetchPayrollSummaryParams = {
  branchId: string;
  month: string;
  q?: string | null;
};

export type FetchPayrollStaffDetailParams = {
  branchId: string;
  month: string;
  staffId: string;
};

export type UpsertPayrollProfilePayload = {
  branchId: string;
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
};

export type CreatePayrollBonusPayload = {
  branchId: string;
  businessDate: string;
  bonusType: PayrollBonusType;
  amount: number;
  note: string;
};

export type UpdatePayrollBonusPayload = {
  branchId: string;
  businessDate?: string;
  bonusType?: PayrollBonusType;
  amount?: number;
  note?: string;
  expectedVersion?: number | null;
};

export type VoidPayrollBonusPayload = {
  branchId: string;
  reason: string;
  expectedVersion?: number | null;
};

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function toNumber(value: unknown, fallback = 0): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

function normalizeProfile(raw: any): PayrollProfileView | null {
  if (!raw) return null;
  return {
    payrollProfileId: String(raw?.payrollProfileId ?? raw?.payroll_profile_id ?? ""),
    branchId: String(raw?.branchId ?? raw?.branch_id ?? ""),
    staffId: String(raw?.staffId ?? raw?.staff_id ?? ""),
    salaryMode: String(raw?.salaryMode ?? raw?.salary_mode ?? "MONTHLY").toUpperCase() as PayrollSalaryMode,
    baseMonthlyAmount: toNumber(raw?.baseMonthlyAmount ?? raw?.base_monthly_amount),
    hourlyRateAmount: toNumber(raw?.hourlyRateAmount ?? raw?.hourly_rate_amount),
    shiftRateMorning: toNumber(raw?.shiftRateMorning ?? raw?.shift_rate_morning),
    shiftRateEvening: toNumber(raw?.shiftRateEvening ?? raw?.shift_rate_evening),
    latePenaltyPerMinute: toNumber(raw?.latePenaltyPerMinute ?? raw?.late_penalty_per_minute),
    earlyLeavePenaltyPerMinute: toNumber(raw?.earlyLeavePenaltyPerMinute ?? raw?.early_leave_penalty_per_minute),
    absencePenaltyAmount: toNumber(raw?.absencePenaltyAmount ?? raw?.absence_penalty_amount),
    isActive: Boolean(raw?.isActive ?? raw?.is_active),
    note: toNullableString(raw?.note),
    version: toNumber(raw?.version, 1),
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ""),
  };
}

function normalizeAttendance(raw: any): PayrollAttendanceSummary {
  return {
    workedMinutes: toNumber(raw?.workedMinutes ?? raw?.worked_minutes),
    lateMinutes: toNumber(raw?.lateMinutes ?? raw?.late_minutes),
    earlyLeaveMinutes: toNumber(raw?.earlyLeaveMinutes ?? raw?.early_leave_minutes),
    absentCount: toNumber(raw?.absentCount ?? raw?.absent_count),
    attendedShiftCount: toNumber(raw?.attendedShiftCount ?? raw?.attended_shift_count),
    morningShiftCount: toNumber(raw?.morningShiftCount ?? raw?.morning_shift_count),
    eveningShiftCount: toNumber(raw?.eveningShiftCount ?? raw?.evening_shift_count),
  };
}

function normalizeTotals(raw: any): PayrollComputedTotals {
  return {
    grossAmount: toNumber(raw?.grossAmount ?? raw?.gross_amount),
    penaltyAmount: toNumber(raw?.penaltyAmount ?? raw?.penalty_amount),
    bonusAmount: toNumber(raw?.bonusAmount ?? raw?.bonus_amount),
    estimatedNetAmount: toNumber(raw?.estimatedNetAmount ?? raw?.estimated_net_amount),
  };
}

function normalizeSummaryRow(raw: any): PayrollSummaryRow {
  return {
    branchId: String(raw?.branchId ?? raw?.branch_id ?? ""),
    staffId: String(raw?.staffId ?? raw?.staff_id ?? ""),
    staffName: toNullableString(raw?.staffName ?? raw?.staff_name ?? raw?.fullName ?? raw?.full_name),
    username: String(raw?.username ?? ""),
    staffRole: String(raw?.staffRole ?? raw?.staff_role ?? ""),
    staffStatus: String(raw?.staffStatus ?? raw?.staff_status ?? ""),
    month: String(raw?.month ?? ""),
    profile: normalizeProfile(raw?.profile),
    attendance: normalizeAttendance(raw?.attendance),
    totals: normalizeTotals(raw?.totals),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ""),
  };
}

function normalizeBonus(raw: any): PayrollBonusEntryView {
  return {
    payrollBonusId: String(raw?.payrollBonusId ?? raw?.payroll_bonus_id ?? ""),
    branchId: String(raw?.branchId ?? raw?.branch_id ?? ""),
    staffId: String(raw?.staffId ?? raw?.staff_id ?? ""),
    businessDate: String(raw?.businessDate ?? raw?.business_date ?? ""),
    bonusType: String(raw?.bonusType ?? raw?.bonus_type ?? "PERFORMANCE").toUpperCase() as PayrollBonusType,
    amount: toNumber(raw?.amount),
    note: String(raw?.note ?? ""),
    isVoid: Boolean(raw?.isVoid ?? raw?.is_void),
    voidReason: toNullableString(raw?.voidReason ?? raw?.void_reason),
    createdByType: String(raw?.createdByType ?? raw?.created_by_type ?? ""),
    createdById: String(raw?.createdById ?? raw?.created_by_id ?? ""),
    updatedByType: toNullableString(raw?.updatedByType ?? raw?.updated_by_type),
    updatedById: toNullableString(raw?.updatedById ?? raw?.updated_by_id),
    voidedByType: toNullableString(raw?.voidedByType ?? raw?.voided_by_type),
    voidedById: toNullableString(raw?.voidedById ?? raw?.voided_by_id),
    version: toNumber(raw?.version, 1),
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ""),
  };
}

export async function fetchPayrollSummary(
  params: FetchPayrollSummaryParams,
): Promise<PayrollSummaryRow[]> {
  const query = new URLSearchParams();
  query.set("branchId", params.branchId);
  query.set("month", params.month);
  if (params.q && params.q.trim()) query.set("q", params.q.trim());
  const raw = await apiFetchAuthed<any>(`/admin/payroll/summary?${query.toString()}`);
  return Array.isArray(raw?.items) ? raw.items.map(normalizeSummaryRow) : [];
}

export async function fetchPayrollStaffDetail(
  params: FetchPayrollStaffDetailParams,
): Promise<PayrollStaffDetailView> {
  const query = new URLSearchParams();
  query.set("branchId", params.branchId);
  query.set("month", params.month);
  const raw = await apiFetchAuthed<any>(
    `/admin/payroll/staff/${encodeURIComponent(params.staffId)}?${query.toString()}`,
  );
  return {
    summary: normalizeSummaryRow(raw?.summary),
    bonuses: Array.isArray(raw?.bonuses) ? raw.bonuses.map(normalizeBonus) : [],
  };
}

export async function upsertPayrollProfile(
  staffId: string,
  payload: UpsertPayrollProfilePayload,
): Promise<PayrollProfileView> {
  const raw = await apiFetchAuthed<any>(`/admin/payroll/profiles/${encodeURIComponent(staffId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeProfile(raw)!;
}

export async function createPayrollBonus(
  staffId: string,
  payload: CreatePayrollBonusPayload,
  idempotencyKey?: string,
): Promise<PayrollBonusEntryView> {
  const raw = await apiFetchAuthed<any>(`/admin/payroll/staff/${encodeURIComponent(staffId)}/bonuses`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeBonus(raw);
}

export async function updatePayrollBonus(
  payrollBonusId: string,
  payload: UpdatePayrollBonusPayload,
): Promise<PayrollBonusEntryView> {
  const raw = await apiFetchAuthed<any>(`/admin/payroll/bonuses/${encodeURIComponent(payrollBonusId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeBonus(raw);
}

export async function voidPayrollBonus(
  payrollBonusId: string,
  payload: VoidPayrollBonusPayload,
  idempotencyKey?: string,
): Promise<PayrollBonusEntryView> {
  const raw = await apiFetchAuthed<any>(`/admin/payroll/bonuses/${encodeURIComponent(payrollBonusId)}/void`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeBonus(raw);
}
