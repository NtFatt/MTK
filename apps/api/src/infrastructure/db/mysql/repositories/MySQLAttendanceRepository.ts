import type {
  AttendanceActorRef,
  AttendanceRecordView,
  IAttendanceRepository,
} from "../../../../application/ports/repositories/IAttendanceRepository.js";
import { getShiftTemplate, type ShiftCode } from "../../../../domain/shifts/templates.js";
import { pool } from "../connection.js";

const LATE_GRACE_MINUTES = 10;
const EARLY_LEAVE_GRACE_MINUTES = 10;
const MISSING_CHECKOUT_GRACE_MINUTES = 60;

function toIso(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnly(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : "";
}

function toInt(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function formatTime(value: string): string {
  return value.slice(0, 8);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60_000));
}

function parsePerformedAt(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_ATTENDANCE_TIME");
  return date;
}

function buildLocalDate(dateOnly: string, time: string, dayOffset = 0): Date {
  const base = new Date(`${dateOnly}T${formatTime(time)}`);
  if (Number.isNaN(base.getTime())) throw new Error("INVALID_ATTENDANCE_TIME");
  if (dayOffset !== 0) {
    base.setDate(base.getDate() + dayOffset);
  }
  return base;
}

function buildScheduledRange(businessDate: string, shiftCode: ShiftCode) {
  const template = getShiftTemplate(shiftCode);
  if (!template) throw new Error("SHIFT_TEMPLATE_INVALID");

  const scheduledStart = buildLocalDate(businessDate, template.startTime);
  const scheduledEnd = buildLocalDate(
    businessDate,
    template.endTime,
    template.crossesMidnight ? 1 : 0,
  );

  return {
    shiftName: template.name,
    startTime: template.startTime,
    endTime: template.endTime,
    crossesMidnight: template.crossesMidnight,
    scheduledStart,
    scheduledEnd,
  };
}

function computeLateMinutes(checkInAt: Date, scheduledStart: Date): number {
  const graceThreshold = addMinutes(scheduledStart, LATE_GRACE_MINUTES);
  if (checkInAt.getTime() <= graceThreshold.getTime()) return 0;
  return minutesBetween(scheduledStart, checkInAt);
}

function computeEarlyLeaveMinutes(checkOutAt: Date, scheduledEnd: Date): number {
  const graceThreshold = addMinutes(scheduledEnd, -EARLY_LEAVE_GRACE_MINUTES);
  if (checkOutAt.getTime() >= graceThreshold.getTime()) return 0;
  return minutesBetween(checkOutAt, scheduledEnd);
}

function appendNote(existing: string | null, prefix: string, next: string): string {
  const trimmedNext = next.trim();
  if (!trimmedNext) throw new Error("ATTENDANCE_NOTE_REQUIRED");
  const line = `${prefix}: ${trimmedNext}`;
  const trimmedExisting = String(existing ?? "").trim();
  if (!trimmedExisting) return line;
  if (trimmedExisting.includes(line)) return trimmedExisting;
  return `${trimmedExisting}\n${line}`;
}

function deriveStatus(input: {
  rawStatus: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  scheduledEndAt: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
}): AttendanceRecordView["status"] {
  const raw = String(input.rawStatus ?? "").trim().toUpperCase();
  if (raw === "ABSENT" || raw === "ON_LEAVE" || raw === "CORRECTED") {
    return raw as AttendanceRecordView["status"];
  }

  if (!input.checkInAt) return "NOT_CHECKED_IN";

  if (!input.checkOutAt) {
    const scheduledEnd = new Date(input.scheduledEndAt);
    if (
      Number.isFinite(scheduledEnd.getTime()) &&
      Date.now() > addMinutes(scheduledEnd, MISSING_CHECKOUT_GRACE_MINUTES).getTime()
    ) {
      return "MISSING_CHECKOUT";
    }
    return input.lateMinutes > 0 ? "LATE" : "PRESENT";
  }

  if (input.earlyLeaveMinutes > 0) return "EARLY_LEAVE";
  if (input.lateMinutes > 0) return "LATE";
  return "PRESENT";
}

function mapRow(row: any): AttendanceRecordView {
  const shiftCode = String(row.shift_code ?? "").toUpperCase() as ShiftCode;
  const template = getShiftTemplate(shiftCode);
  const scheduledStartAt = toIso(row.scheduled_start_at);
  const scheduledEndAt = toIso(row.scheduled_end_at);
  if (!scheduledStartAt || !scheduledEndAt) throw new Error("INVALID_ATTENDANCE_TIME");

  const checkInAt = toIso(row.check_in_at);
  const checkOutAt = toIso(row.check_out_at);
  const workedMinutes =
    checkInAt && !checkOutAt
      ? minutesBetween(new Date(checkInAt), new Date())
      : row.worked_minutes == null
        ? null
        : toInt(row.worked_minutes);

  return {
    attendanceId: String(row.attendance_id),
    branchId: String(row.branch_id),
    staffId: String(row.staff_id),
    staffName: row.full_name != null ? String(row.full_name) : null,
    username: String(row.username ?? ""),
    staffRole: String(row.staff_role ?? ""),
    staffStatus: String(row.staff_status ?? ""),
    businessDate: toDateOnly(row.business_date),
    shiftCode,
    shiftName: String(row.shift_name ?? template?.name ?? ""),
    startTime: template?.startTime ?? formatTime(String(row.shift_start_time ?? "08:00:00")),
    endTime: template?.endTime ?? formatTime(String(row.shift_end_time ?? "16:00:00")),
    crossesMidnight: Boolean(template?.crossesMidnight),
    scheduledStartAt,
    scheduledEndAt,
    checkInAt,
    checkOutAt,
    status: deriveStatus({
      rawStatus: String(row.status ?? "NOT_CHECKED_IN"),
      checkInAt,
      checkOutAt,
      scheduledEndAt,
      lateMinutes: toInt(row.late_minutes),
      earlyLeaveMinutes: toInt(row.early_leave_minutes),
    }),
    source: String(row.source ?? "MANAGER_MANUAL").toUpperCase() as AttendanceRecordView["source"],
    note: row.note != null ? String(row.note) : null,
    lateMinutes: toInt(row.late_minutes),
    earlyLeaveMinutes: toInt(row.early_leave_minutes),
    workedMinutes,
    isCorrected: Boolean(row.is_corrected),
    lastCorrectedAt: toIso(row.last_corrected_at),
    lastCorrectedByType: row.last_corrected_by_type != null ? String(row.last_corrected_by_type) : null,
    lastCorrectedById: row.last_corrected_by_id != null ? String(row.last_corrected_by_id) : null,
    version: toInt(row.version || 1),
    isOpen: !!checkInAt && !checkOutAt,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

async function fetchOne(
  db: { query: typeof pool.query },
  sql: string,
  params: unknown[],
): Promise<AttendanceRecordView | null> {
  const [rows]: any = await db.query(sql, params);
  const row = rows?.[0];
  return row ? mapRow(row) : null;
}

const BASE_SELECT = `
  SELECT
    ar.*,
    su.username,
    su.full_name,
    su.role AS staff_role,
    su.status AS staff_status
  FROM attendance_records ar
  JOIN staff_users su ON su.staff_id = ar.staff_id
`;

export class MySQLAttendanceRepository implements IAttendanceRepository {
  async listRecordsForShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
  }): Promise<AttendanceRecordView[]> {
    if (!input.staffIds.length) return [];
    const placeholders = input.staffIds.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
      `${BASE_SELECT}
       WHERE ar.branch_id = ?
         AND ar.business_date = ?
         AND ar.shift_code = ?
         AND ar.staff_id IN (${placeholders})
       ORDER BY COALESCE(su.full_name, su.username) ASC, su.staff_id ASC`,
      [input.branchId, input.businessDate, input.shiftCode, ...input.staffIds],
    );

    return ((rows as any[]) ?? []).map(mapRow);
  }

  async getById(input: { branchId: string; attendanceId: string }): Promise<AttendanceRecordView | null> {
    return fetchOne(
      pool,
      `${BASE_SELECT}
       WHERE ar.branch_id = ?
         AND ar.attendance_id = ?
       LIMIT 1`,
      [input.branchId, input.attendanceId],
    );
  }

  async listStaffHistory(input: {
    branchId: string;
    staffId: string;
    limit: number;
  }): Promise<AttendanceRecordView[]> {
    const limit = Math.max(1, Math.min(30, Number(input.limit ?? 10)));
    const [rows]: any = await pool.query(
      `${BASE_SELECT}
       WHERE ar.branch_id = ?
         AND ar.staff_id = ?
       ORDER BY ar.business_date DESC, ar.shift_code ASC, ar.updated_at DESC
       LIMIT ?`,
      [input.branchId, input.staffId, limit],
    );

    return ((rows as any[]) ?? []).map(mapRow);
  }

  async findByStaffShift(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
  }): Promise<AttendanceRecordView | null> {
    return fetchOne(
      pool,
      `${BASE_SELECT}
       WHERE ar.branch_id = ?
         AND ar.staff_id = ?
         AND ar.business_date = ?
         AND ar.shift_code = ?
       LIMIT 1`,
      [input.branchId, input.staffId, input.businessDate, input.shiftCode],
    );
  }

  async findOpenByStaff(input: { branchId: string; staffId: string }): Promise<AttendanceRecordView | null> {
    return fetchOne(
      pool,
      `${BASE_SELECT}
       WHERE ar.branch_id = ?
         AND ar.staff_id = ?
         AND ar.check_in_at IS NOT NULL
         AND ar.check_out_at IS NULL
       ORDER BY ar.updated_at DESC
       LIMIT 1`,
      [input.branchId, input.staffId],
    );
  }

  async manualCheckIn(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    performedAt: string;
    note: string;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView> {
    const performedAt = parsePerformedAt(input.performedAt);
    const shift = buildScheduledRange(input.businessDate, input.shiftCode);
    const lateMinutes = computeLateMinutes(performedAt, shift.scheduledStart);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [openRows]: any = await conn.query(
        `SELECT attendance_id, business_date, shift_code
         FROM attendance_records
         WHERE branch_id = ?
           AND staff_id = ?
           AND check_in_at IS NOT NULL
           AND check_out_at IS NULL
         LIMIT 1
         FOR UPDATE`,
        [input.branchId, input.staffId],
      );
      const openRow = openRows?.[0];
      if (
        openRow &&
        (
          String(openRow.business_date).slice(0, 10) !== input.businessDate ||
          String(openRow.shift_code).toUpperCase() !== input.shiftCode
        )
      ) {
        throw new Error("ATTENDANCE_ALREADY_OPEN");
      }

      const [sameShiftRows]: any = await conn.query(
        `SELECT *
         FROM attendance_records
         WHERE branch_id = ?
           AND staff_id = ?
           AND business_date = ?
           AND shift_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.branchId, input.staffId, input.businessDate, input.shiftCode],
      );
      const sameShift = sameShiftRows?.[0];

      let attendanceId = "";
      if (sameShift) {
        if (sameShift.check_in_at != null) throw new Error("ATTENDANCE_ALREADY_CHECKED_IN");
        const corrected =
          String(sameShift.status ?? "").toUpperCase() === "ABSENT" || Boolean(sameShift.is_corrected);
        const status = corrected ? "CORRECTED" : lateMinutes > 0 ? "LATE" : "PRESENT";

        await conn.query(
          `UPDATE attendance_records
           SET shift_name = ?,
               scheduled_start_at = ?,
               scheduled_end_at = ?,
               check_in_at = ?,
               check_out_at = NULL,
               status = ?,
               source = 'MANAGER_MANUAL',
               note = ?,
               late_minutes = ?,
               early_leave_minutes = 0,
               worked_minutes = NULL,
               is_corrected = ?,
               last_corrected_at = ?,
               last_corrected_by_type = ?,
               last_corrected_by_id = ?,
               version = version + 1
           WHERE attendance_id = ?`,
          [
            shift.shiftName,
            shift.scheduledStart,
            shift.scheduledEnd,
            performedAt,
            status,
            appendNote(sameShift.note != null ? String(sameShift.note) : null, "CHECK-IN", input.note),
            lateMinutes,
            corrected ? 1 : 0,
            corrected ? new Date() : null,
            corrected ? input.actor.actorType : null,
            corrected ? input.actor.actorId : null,
            sameShift.attendance_id,
          ],
        );
        attendanceId = String(sameShift.attendance_id);
      } else {
        const [result]: any = await conn.query(
          `INSERT INTO attendance_records (
             branch_id,
             staff_id,
             business_date,
             shift_code,
             shift_name,
             scheduled_start_at,
             scheduled_end_at,
             check_in_at,
             status,
             source,
             note,
             late_minutes,
             early_leave_minutes,
             worked_minutes,
             is_corrected
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANAGER_MANUAL', ?, ?, 0, NULL, 0)`,
          [
            input.branchId,
            input.staffId,
            input.businessDate,
            input.shiftCode,
            shift.shiftName,
            shift.scheduledStart,
            shift.scheduledEnd,
            performedAt,
            lateMinutes > 0 ? "LATE" : "PRESENT",
            appendNote(null, "CHECK-IN", input.note),
            lateMinutes,
          ],
        );
        attendanceId = String(result?.insertId ?? "");
      }

      await conn.commit();
      const fresh = await this.getById({ branchId: input.branchId, attendanceId });
      if (!fresh) throw new Error("ATTENDANCE_NOT_FOUND");
      return fresh;
    } catch (error: any) {
      await conn.rollback();
      if (error?.code === "ER_DUP_ENTRY") throw new Error("ATTENDANCE_ALREADY_OPEN");
      throw error;
    } finally {
      conn.release();
    }
  }

  async manualCheckOut(input: {
    branchId: string;
    attendanceId: string;
    performedAt: string;
    note: string;
    expectedVersion?: number | null;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView> {
    const performedAt = parsePerformedAt(input.performedAt);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT *
         FROM attendance_records
         WHERE attendance_id = ?
           AND branch_id = ?
         LIMIT 1
         FOR UPDATE`,
        [input.attendanceId, input.branchId],
      );
      const row = rows?.[0];
      if (!row) throw new Error("ATTENDANCE_NOT_FOUND");
      if (row.check_in_at == null) throw new Error("ATTENDANCE_CHECKOUT_BEFORE_CHECKIN");
      if (row.check_out_at != null) throw new Error("ATTENDANCE_ALREADY_CHECKED_OUT");
      if (
        input.expectedVersion != null &&
        toInt(input.expectedVersion) > 0 &&
        toInt(row.version) !== toInt(input.expectedVersion)
      ) {
        throw new Error("ATTENDANCE_STALE");
      }

      const checkInAt = new Date(row.check_in_at);
      if (Number.isNaN(checkInAt.getTime()) || performedAt.getTime() < checkInAt.getTime()) {
        throw new Error("ATTENDANCE_CHECKOUT_BEFORE_CHECKIN");
      }

      const scheduledEndAt = new Date(row.scheduled_end_at);
      const earlyLeaveMinutes = Number.isNaN(scheduledEndAt.getTime())
        ? 0
        : computeEarlyLeaveMinutes(performedAt, scheduledEndAt);
      const workedMinutes = minutesBetween(checkInAt, performedAt);
      const corrected = String(row.status ?? "").toUpperCase() === "CORRECTED" || Boolean(row.is_corrected);
      const lateMinutes = toInt(row.late_minutes);
      const nextStatus = corrected
        ? "CORRECTED"
        : earlyLeaveMinutes > 0
          ? "EARLY_LEAVE"
          : lateMinutes > 0
            ? "LATE"
            : "PRESENT";

      await conn.query(
        `UPDATE attendance_records
         SET check_out_at = ?,
             status = ?,
             note = ?,
             early_leave_minutes = ?,
             worked_minutes = ?,
             version = version + 1
         WHERE attendance_id = ?`,
        [
          performedAt,
          nextStatus,
          appendNote(row.note != null ? String(row.note) : null, "CHECK-OUT", input.note),
          earlyLeaveMinutes,
          workedMinutes,
          input.attendanceId,
        ],
      );

      await conn.commit();
      const fresh = await this.getById({ branchId: input.branchId, attendanceId: input.attendanceId });
      if (!fresh) throw new Error("ATTENDANCE_NOT_FOUND");
      return fresh;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async markAbsent(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    note: string;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView> {
    const shift = buildScheduledRange(input.businessDate, input.shiftCode);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [openRows]: any = await conn.query(
        `SELECT attendance_id
         FROM attendance_records
         WHERE branch_id = ?
           AND staff_id = ?
           AND check_in_at IS NOT NULL
           AND check_out_at IS NULL
         LIMIT 1
         FOR UPDATE`,
        [input.branchId, input.staffId],
      );
      if (openRows?.length) throw new Error("ATTENDANCE_ALREADY_OPEN");

      const [rows]: any = await conn.query(
        `SELECT *
         FROM attendance_records
         WHERE branch_id = ?
           AND staff_id = ?
           AND business_date = ?
           AND shift_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.branchId, input.staffId, input.businessDate, input.shiftCode],
      );

      const row = rows?.[0];
      let attendanceId = "";
      if (row) {
        if (String(row.status ?? "").toUpperCase() === "ABSENT" && row.check_in_at == null) {
          throw new Error("ATTENDANCE_ALREADY_MARKED_ABSENT");
        }
        if (row.check_in_at != null || row.check_out_at != null) {
          throw new Error("ATTENDANCE_ALREADY_CHECKED_IN");
        }

        await conn.query(
          `UPDATE attendance_records
           SET shift_name = ?,
               scheduled_start_at = ?,
               scheduled_end_at = ?,
               status = 'ABSENT',
               source = 'MANAGER_MANUAL',
               note = ?,
               late_minutes = 0,
               early_leave_minutes = 0,
               worked_minutes = NULL,
               check_in_at = NULL,
               check_out_at = NULL,
               version = version + 1
           WHERE attendance_id = ?`,
          [
            shift.shiftName,
            shift.scheduledStart,
            shift.scheduledEnd,
            appendNote(row.note != null ? String(row.note) : null, "ABSENT", input.note),
            row.attendance_id,
          ],
        );
        attendanceId = String(row.attendance_id);
      } else {
        const [result]: any = await conn.query(
          `INSERT INTO attendance_records (
             branch_id,
             staff_id,
             business_date,
             shift_code,
             shift_name,
             scheduled_start_at,
             scheduled_end_at,
             status,
             source,
             note,
             late_minutes,
             early_leave_minutes,
             worked_minutes,
             is_corrected
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ABSENT', 'MANAGER_MANUAL', ?, 0, 0, NULL, 0)`,
          [
            input.branchId,
            input.staffId,
            input.businessDate,
            input.shiftCode,
            shift.shiftName,
            shift.scheduledStart,
            shift.scheduledEnd,
            appendNote(null, "ABSENT", input.note),
          ],
        );
        attendanceId = String(result?.insertId ?? "");
      }

      await conn.commit();
      const fresh = await this.getById({ branchId: input.branchId, attendanceId });
      if (!fresh) throw new Error("ATTENDANCE_NOT_FOUND");
      return fresh;
    } catch (error: any) {
      await conn.rollback();
      if (error?.code === "ER_DUP_ENTRY") throw new Error("ATTENDANCE_ALREADY_OPEN");
      throw error;
    } finally {
      conn.release();
    }
  }
}
