import type {
  IPayrollRepository,
  PayrollAttendanceSummary,
  PayrollBonusEntryView,
  PayrollBonusType,
  PayrollComputedTotals,
  PayrollProfileView,
  PayrollSalaryMode,
  PayrollStaffDetailView,
  PayrollSummaryRow,
} from "../../../../application/ports/repositories/IPayrollRepository.js";
import { pool } from "../connection.js";

type StaffWithProfileRow = {
  staff_id: string | number;
  username: string;
  full_name: string | null;
  role: string;
  status: string;
  branch_id: string | number;
  payroll_profile_id: string | number | null;
  salary_mode: string | null;
  base_monthly_amount: number | null;
  hourly_rate_amount: number | null;
  shift_rate_morning: number | null;
  shift_rate_evening: number | null;
  late_penalty_per_minute: number | null;
  early_leave_penalty_per_minute: number | null;
  absence_penalty_amount: number | null;
  is_active: number | boolean | null;
  note: string | null;
  version: number | null;
  profile_created_at: unknown;
  profile_updated_at: unknown;
};

type AttendanceAggregateRow = {
  staff_id: string | number;
  worked_minutes: number | null;
  late_minutes: number | null;
  early_leave_minutes: number | null;
  absent_count: number | null;
  attended_shift_count: number | null;
  morning_shift_count: number | null;
  evening_shift_count: number | null;
};

type BonusAggregateRow = {
  staff_id: string | number;
  bonus_total: number | null;
};

function toIso(value: unknown): string {
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toIsoNullable(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnly(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  const iso = toIsoNullable(value);
  return iso ? iso.slice(0, 10) : "";
}

function toMoney(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function normalizeMonth(month: string): { month: string; from: string; toExclusive: string } {
  const trimmed = String(month ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) throw new Error("PAYROLL_MONTH_INVALID");
  const [yearStr, monthStr] = trimmed.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    throw new Error("PAYROLL_MONTH_INVALID");
  }

  const from = `${yearStr}-${monthStr}-01`;
  const next = new Date(Date.UTC(year, monthIndex, 1));
  const nextMonth = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return { month: trimmed, from, toExclusive: nextMonth };
}

function mapProfile(row: StaffWithProfileRow): PayrollProfileView | null {
  if (row.payroll_profile_id == null) return null;
  return {
    payrollProfileId: String(row.payroll_profile_id),
    branchId: String(row.branch_id),
    staffId: String(row.staff_id),
    salaryMode: String(row.salary_mode ?? "MONTHLY").toUpperCase() as PayrollSalaryMode,
    baseMonthlyAmount: toMoney(row.base_monthly_amount),
    hourlyRateAmount: toMoney(row.hourly_rate_amount),
    shiftRateMorning: toMoney(row.shift_rate_morning),
    shiftRateEvening: toMoney(row.shift_rate_evening),
    latePenaltyPerMinute: toMoney(row.late_penalty_per_minute),
    earlyLeavePenaltyPerMinute: toMoney(row.early_leave_penalty_per_minute),
    absencePenaltyAmount: toMoney(row.absence_penalty_amount),
    isActive: Boolean(row.is_active),
    note: row.note != null ? String(row.note) : null,
    version: Number(row.version ?? 1),
    createdAt: toIso(row.profile_created_at),
    updatedAt: toIso(row.profile_updated_at),
  };
}

function computeGross(profile: PayrollProfileView | null, attendance: PayrollAttendanceSummary): number {
  if (!profile?.isActive) return 0;
  if (profile.salaryMode === "HOURLY") {
    return Math.round((attendance.workedMinutes / 60) * profile.hourlyRateAmount);
  }
  if (profile.salaryMode === "SHIFT") {
    return attendance.morningShiftCount * profile.shiftRateMorning +
      attendance.eveningShiftCount * profile.shiftRateEvening;
  }
  return profile.baseMonthlyAmount;
}

function computePenalty(profile: PayrollProfileView | null, attendance: PayrollAttendanceSummary): number {
  if (!profile?.isActive) return 0;
  return attendance.lateMinutes * profile.latePenaltyPerMinute +
    attendance.earlyLeaveMinutes * profile.earlyLeavePenaltyPerMinute +
    attendance.absentCount * profile.absencePenaltyAmount;
}

function mapBonusRow(row: any): PayrollBonusEntryView {
  return {
    payrollBonusId: String(row.payroll_bonus_id),
    branchId: String(row.branch_id),
    staffId: String(row.staff_id),
    businessDate: toDateOnly(row.business_date),
    bonusType: String(row.bonus_type ?? "PERFORMANCE").toUpperCase() as PayrollBonusType,
    amount: toMoney(row.amount),
    note: String(row.note ?? ""),
    isVoid: Boolean(row.is_void),
    voidReason: row.void_reason != null ? String(row.void_reason) : null,
    createdByType: String(row.created_by_type ?? ""),
    createdById: String(row.created_by_id ?? ""),
    updatedByType: row.updated_by_type != null ? String(row.updated_by_type) : null,
    updatedById: row.updated_by_id != null ? String(row.updated_by_id) : null,
    voidedByType: row.voided_by_type != null ? String(row.voided_by_type) : null,
    voidedById: row.voided_by_id != null ? String(row.voided_by_id) : null,
    version: Number(row.version ?? 1),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export class MySQLPayrollRepository implements IPayrollRepository {
  private async loadStaffWithProfiles(input: {
    branchId: string;
    q?: string | null;
    staffId?: string | null;
  }): Promise<StaffWithProfileRow[]> {
    const where = ["su.branch_id = ?"];
    const params: unknown[] = [input.branchId];

    if (input.staffId) {
      where.push("su.staff_id = ?");
      params.push(String(input.staffId));
    }

    const q = String(input.q ?? "").trim().toLowerCase();
    if (q) {
      where.push("(LOWER(su.username) LIKE ? OR LOWER(COALESCE(su.full_name, '')) LIKE ? OR CAST(su.staff_id AS CHAR) LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows]: any = await pool.query(
      `SELECT
         su.staff_id,
         su.username,
         su.full_name,
         su.role,
         su.status,
         su.branch_id,
         pp.payroll_profile_id,
         pp.salary_mode,
         pp.base_monthly_amount,
         pp.hourly_rate_amount,
         pp.shift_rate_morning,
         pp.shift_rate_evening,
         pp.late_penalty_per_minute,
         pp.early_leave_penalty_per_minute,
         pp.absence_penalty_amount,
         pp.is_active,
         pp.note,
         pp.version,
         pp.created_at AS profile_created_at,
         pp.updated_at AS profile_updated_at
       FROM staff_users su
       LEFT JOIN payroll_profiles pp
         ON pp.branch_id = su.branch_id
        AND pp.staff_id = su.staff_id
       WHERE ${where.join(" AND ")}
       ORDER BY su.status = 'ACTIVE' DESC, COALESCE(su.full_name, su.username) ASC, su.staff_id ASC`,
      params,
    );

    return (rows ?? []) as StaffWithProfileRow[];
  }

  private async loadAttendanceAggregate(input: {
    branchId: string;
    from: string;
    toExclusive: string;
    staffId?: string | null;
  }) {
    const where = [
      "branch_id = ?",
      "business_date >= ?",
      "business_date < ?",
    ];
    const params: unknown[] = [input.branchId, input.from, input.toExclusive];

    if (input.staffId) {
      where.push("staff_id = ?");
      params.push(String(input.staffId));
    }

    const [rows]: any = await pool.query(
      `SELECT
         staff_id,
         COALESCE(SUM(
           CASE
             WHEN worked_minutes IS NOT NULL THEN worked_minutes
             WHEN check_in_at IS NOT NULL AND check_out_at IS NULL THEN TIMESTAMPDIFF(MINUTE, check_in_at, CURRENT_TIMESTAMP)
             ELSE 0
           END
         ), 0) AS worked_minutes,
         COALESCE(SUM(late_minutes), 0) AS late_minutes,
         COALESCE(SUM(early_leave_minutes), 0) AS early_leave_minutes,
         COALESCE(SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absent_count,
         COALESCE(SUM(CASE WHEN check_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS attended_shift_count,
         COALESCE(SUM(CASE WHEN shift_code = 'MORNING' AND check_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS morning_shift_count,
         COALESCE(SUM(CASE WHEN shift_code = 'EVENING' AND check_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS evening_shift_count
       FROM attendance_records
       WHERE ${where.join(" AND ")}
       GROUP BY staff_id`,
      params,
    );

    const map = new Map<string, PayrollAttendanceSummary>();
    for (const row of (rows ?? []) as AttendanceAggregateRow[]) {
      map.set(String(row.staff_id), {
        workedMinutes: toMoney(row.worked_minutes),
        lateMinutes: toMoney(row.late_minutes),
        earlyLeaveMinutes: toMoney(row.early_leave_minutes),
        absentCount: toMoney(row.absent_count),
        attendedShiftCount: toMoney(row.attended_shift_count),
        morningShiftCount: toMoney(row.morning_shift_count),
        eveningShiftCount: toMoney(row.evening_shift_count),
      });
    }
    return map;
  }

  private async loadBonusAggregate(input: {
    branchId: string;
    from: string;
    toExclusive: string;
    staffId?: string | null;
  }) {
    const where = [
      "branch_id = ?",
      "business_date >= ?",
      "business_date < ?",
      "is_void = 0",
    ];
    const params: unknown[] = [input.branchId, input.from, input.toExclusive];

    if (input.staffId) {
      where.push("staff_id = ?");
      params.push(String(input.staffId));
    }

    const [rows]: any = await pool.query(
      `SELECT
         staff_id,
         COALESCE(SUM(amount), 0) AS bonus_total
       FROM payroll_bonus_entries
       WHERE ${where.join(" AND ")}
       GROUP BY staff_id`,
      params,
    );

    const map = new Map<string, number>();
    for (const row of (rows ?? []) as BonusAggregateRow[]) {
      map.set(String(row.staff_id), toMoney(row.bonus_total));
    }
    return map;
  }

  private buildSummaryRows(input: {
    month: string;
    staffRows: StaffWithProfileRow[];
    attendanceMap: Map<string, PayrollAttendanceSummary>;
    bonusMap: Map<string, number>;
  }): PayrollSummaryRow[] {
    return input.staffRows.map((row) => {
      const profile = mapProfile(row);
      const attendance = input.attendanceMap.get(String(row.staff_id)) ?? {
        workedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        absentCount: 0,
        attendedShiftCount: 0,
        morningShiftCount: 0,
        eveningShiftCount: 0,
      };
      const bonusAmount = input.bonusMap.get(String(row.staff_id)) ?? 0;
      const grossAmount = computeGross(profile, attendance);
      const penaltyAmount = computePenalty(profile, attendance);
      const totals: PayrollComputedTotals = {
        grossAmount,
        penaltyAmount,
        bonusAmount,
        estimatedNetAmount: grossAmount - penaltyAmount + bonusAmount,
      };

      return {
        branchId: String(row.branch_id),
        staffId: String(row.staff_id),
        staffName: row.full_name != null ? String(row.full_name) : null,
        username: String(row.username),
        staffRole: String(row.role).toUpperCase() as PayrollSummaryRow["staffRole"],
        staffStatus: String(row.status).toUpperCase() as PayrollSummaryRow["staffStatus"],
        month: input.month,
        profile,
        attendance,
        totals,
        updatedAt: profile?.updatedAt ?? new Date().toISOString(),
      };
    });
  }

  async listSummary(input: {
    branchId: string;
    month: string;
    q?: string | null;
  }): Promise<PayrollSummaryRow[]> {
    const range = normalizeMonth(input.month);
    const staffRows = await this.loadStaffWithProfiles({
      branchId: input.branchId,
      q: input.q ?? null,
    });
    const attendanceMap = await this.loadAttendanceAggregate({
      branchId: input.branchId,
      from: range.from,
      toExclusive: range.toExclusive,
    });
    const bonusMap = await this.loadBonusAggregate({
      branchId: input.branchId,
      from: range.from,
      toExclusive: range.toExclusive,
    });

    return this.buildSummaryRows({
      month: range.month,
      staffRows,
      attendanceMap,
      bonusMap,
    });
  }

  async getStaffDetail(input: {
    branchId: string;
    staffId: string;
    month: string;
  }): Promise<PayrollStaffDetailView | null> {
    const range = normalizeMonth(input.month);
    const staffRows = await this.loadStaffWithProfiles({
      branchId: input.branchId,
      staffId: input.staffId,
    });
    const staffRow = staffRows[0];
    if (!staffRow) return null;

    const attendanceMap = await this.loadAttendanceAggregate({
      branchId: input.branchId,
      from: range.from,
      toExclusive: range.toExclusive,
      staffId: input.staffId,
    });
    const bonusMap = await this.loadBonusAggregate({
      branchId: input.branchId,
      from: range.from,
      toExclusive: range.toExclusive,
      staffId: input.staffId,
    });

    const summary = this.buildSummaryRows({
      month: range.month,
      staffRows: [staffRow],
      attendanceMap,
      bonusMap,
    })[0];
    if (!summary) return null;

    const [bonusRows]: any = await pool.query(
      `SELECT *
       FROM payroll_bonus_entries
       WHERE branch_id = ?
         AND staff_id = ?
         AND business_date >= ?
         AND business_date < ?
       ORDER BY business_date DESC, created_at DESC`,
      [input.branchId, input.staffId, range.from, range.toExclusive],
    );

    return {
      summary,
      bonuses: ((bonusRows ?? []) as any[]).map(mapBonusRow),
    };
  }

  async upsertProfile(input: {
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
  }): Promise<PayrollProfileView> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT *
         FROM payroll_profiles
         WHERE branch_id = ?
           AND staff_id = ?
         LIMIT 1
         FOR UPDATE`,
        [input.branchId, input.staffId],
      );
      const existing = rows?.[0] ?? null;

      if (existing) {
        if (
          input.expectedVersion != null &&
          Number(input.expectedVersion) > 0 &&
          Number(existing.version ?? 1) !== Number(input.expectedVersion)
        ) {
          throw new Error("PAYROLL_STALE");
        }

        await conn.query(
          `UPDATE payroll_profiles
           SET salary_mode = ?,
               base_monthly_amount = ?,
               hourly_rate_amount = ?,
               shift_rate_morning = ?,
               shift_rate_evening = ?,
               late_penalty_per_minute = ?,
               early_leave_penalty_per_minute = ?,
               absence_penalty_amount = ?,
               is_active = ?,
               note = ?,
               version = version + 1
           WHERE payroll_profile_id = ?`,
          [
            input.salaryMode,
            toMoney(input.baseMonthlyAmount),
            toMoney(input.hourlyRateAmount),
            toMoney(input.shiftRateMorning),
            toMoney(input.shiftRateEvening),
            toMoney(input.latePenaltyPerMinute),
            toMoney(input.earlyLeavePenaltyPerMinute),
            toMoney(input.absencePenaltyAmount),
            input.isActive ? 1 : 0,
            input.note ?? null,
            existing.payroll_profile_id,
          ],
        );
      } else {
        await conn.query(
          `INSERT INTO payroll_profiles (
             branch_id,
             staff_id,
             salary_mode,
             base_monthly_amount,
             hourly_rate_amount,
             shift_rate_morning,
             shift_rate_evening,
             late_penalty_per_minute,
             early_leave_penalty_per_minute,
             absence_penalty_amount,
             is_active,
             note
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.branchId,
            input.staffId,
            input.salaryMode,
            toMoney(input.baseMonthlyAmount),
            toMoney(input.hourlyRateAmount),
            toMoney(input.shiftRateMorning),
            toMoney(input.shiftRateEvening),
            toMoney(input.latePenaltyPerMinute),
            toMoney(input.earlyLeavePenaltyPerMinute),
            toMoney(input.absencePenaltyAmount),
            input.isActive ? 1 : 0,
            input.note ?? null,
          ],
        );
      }

      await conn.commit();

      const [freshRows]: any = await pool.query(
        `SELECT
           branch_id,
           staff_id,
           payroll_profile_id,
           salary_mode,
           base_monthly_amount,
           hourly_rate_amount,
           shift_rate_morning,
           shift_rate_evening,
           late_penalty_per_minute,
           early_leave_penalty_per_minute,
           absence_penalty_amount,
           is_active,
           note,
           version,
           created_at AS profile_created_at,
           updated_at AS profile_updated_at
         FROM payroll_profiles
         WHERE branch_id = ?
           AND staff_id = ?
         LIMIT 1`,
        [input.branchId, input.staffId],
      );
      const row = freshRows?.[0];
      if (!row) throw new Error("PAYROLL_PROFILE_NOT_FOUND");
      return mapProfile(row as StaffWithProfileRow)!;
    } catch (error: any) {
      await conn.rollback();
      if (error?.code === "ER_DUP_ENTRY") throw new Error("PAYROLL_PROFILE_ALREADY_EXISTS");
      throw error;
    } finally {
      conn.release();
    }
  }

  async createBonus(input: {
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
  }): Promise<PayrollBonusEntryView> {
    const [result]: any = await pool.query(
      `INSERT INTO payroll_bonus_entries (
         branch_id,
         staff_id,
         business_date,
         bonus_type,
         amount,
         note,
         created_by_type,
         created_by_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.branchId,
        input.staffId,
        input.businessDate,
        input.bonusType,
        toMoney(input.amount),
        input.note.trim(),
        input.actor.actorType,
        input.actor.actorId,
      ],
    );

    const [rows]: any = await pool.query(
      `SELECT *
       FROM payroll_bonus_entries
       WHERE payroll_bonus_id = ?
       LIMIT 1`,
      [String(result?.insertId ?? "")],
    );
    const row = rows?.[0];
    if (!row) throw new Error("PAYROLL_BONUS_NOT_FOUND");
    return mapBonusRow(row);
  }

  async updateBonus(input: {
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
  }): Promise<PayrollBonusEntryView> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT *
         FROM payroll_bonus_entries
         WHERE payroll_bonus_id = ?
           AND branch_id = ?
         LIMIT 1
         FOR UPDATE`,
        [input.payrollBonusId, input.branchId],
      );
      const existing = rows?.[0];
      if (!existing) throw new Error("PAYROLL_BONUS_NOT_FOUND");
      if (Boolean(existing.is_void)) throw new Error("PAYROLL_BONUS_VOIDED");
      if (
        input.expectedVersion != null &&
        Number(input.expectedVersion) > 0 &&
        Number(existing.version ?? 1) !== Number(input.expectedVersion)
      ) {
        throw new Error("PAYROLL_STALE");
      }

      await conn.query(
        `UPDATE payroll_bonus_entries
         SET business_date = ?,
             bonus_type = ?,
             amount = ?,
             note = ?,
             updated_by_type = ?,
             updated_by_id = ?,
             version = version + 1
         WHERE payroll_bonus_id = ?`,
        [
          input.businessDate ?? toDateOnly(existing.business_date),
          input.bonusType ?? String(existing.bonus_type).toUpperCase(),
          input.amount != null ? toMoney(input.amount) : toMoney(existing.amount),
          input.note != null ? input.note.trim() : String(existing.note ?? ""),
          input.actor.actorType,
          input.actor.actorId,
          input.payrollBonusId,
        ],
      );

      await conn.commit();

      const [freshRows]: any = await pool.query(
        `SELECT *
         FROM payroll_bonus_entries
         WHERE payroll_bonus_id = ?
         LIMIT 1`,
        [input.payrollBonusId],
      );
      const fresh = freshRows?.[0];
      if (!fresh) throw new Error("PAYROLL_BONUS_NOT_FOUND");
      return mapBonusRow(fresh);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async voidBonus(input: {
    payrollBonusId: string;
    branchId: string;
    reason: string;
    expectedVersion?: number | null;
    actor: {
      actorType: "ADMIN" | "STAFF";
      actorId: string;
    };
  }): Promise<PayrollBonusEntryView> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT *
         FROM payroll_bonus_entries
         WHERE payroll_bonus_id = ?
           AND branch_id = ?
         LIMIT 1
         FOR UPDATE`,
        [input.payrollBonusId, input.branchId],
      );
      const existing = rows?.[0];
      if (!existing) throw new Error("PAYROLL_BONUS_NOT_FOUND");
      if (Boolean(existing.is_void)) throw new Error("PAYROLL_BONUS_VOIDED");
      if (
        input.expectedVersion != null &&
        Number(input.expectedVersion) > 0 &&
        Number(existing.version ?? 1) !== Number(input.expectedVersion)
      ) {
        throw new Error("PAYROLL_STALE");
      }

      await conn.query(
        `UPDATE payroll_bonus_entries
         SET is_void = 1,
             void_reason = ?,
             voided_by_type = ?,
             voided_by_id = ?,
             version = version + 1
         WHERE payroll_bonus_id = ?`,
        [
          input.reason.trim(),
          input.actor.actorType,
          input.actor.actorId,
          input.payrollBonusId,
        ],
      );

      await conn.commit();

      const [freshRows]: any = await pool.query(
        `SELECT *
         FROM payroll_bonus_entries
         WHERE payroll_bonus_id = ?
         LIMIT 1`,
        [input.payrollBonusId],
      );
      const fresh = freshRows?.[0];
      if (!fresh) throw new Error("PAYROLL_BONUS_NOT_FOUND");
      return mapBonusRow(fresh);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
