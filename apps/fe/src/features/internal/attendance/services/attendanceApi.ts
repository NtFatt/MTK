import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type AttendanceStatus =
  | "NOT_CHECKED_IN"
  | "PRESENT"
  | "LATE"
  | "EARLY_LEAVE"
  | "MISSING_CHECKOUT"
  | "ABSENT"
  | "ON_LEAVE"
  | "CORRECTED";

export type AttendanceSource =
  | "SELF"
  | "MANAGER_MANUAL"
  | "AUTO_FROM_SHIFT"
  | "CORRECTION";

export type AttendanceShiftCode = "MORNING" | "EVENING";
export type AttendanceRole = "BRANCH_MANAGER" | "STAFF" | "KITCHEN" | "CASHIER";

export type AttendanceBoardRow = {
  rowKey: string;
  attendanceId: string | null;
  branchId: string;
  staffId: string;
  staffName: string | null;
  username: string;
  staffRole: string;
  staffStatus: string;
  businessDate: string;
  shiftCode: AttendanceShiftCode;
  shiftName: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  scheduledStartAt: string;
  scheduledEndAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  source: AttendanceSource | null;
  note: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number | null;
  isCorrected: boolean;
  lastCorrectedAt: string | null;
  lastCorrectedByType: string | null;
  lastCorrectedById: string | null;
  version: number | null;
  isOpen: boolean;
  isPlaceholder: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceBoardPayload = {
  branchId: string;
  businessDate: string;
  shiftCode: AttendanceShiftCode;
  shiftName: string;
  items: AttendanceBoardRow[];
};

export type AttendanceRecord = Omit<AttendanceBoardRow, "rowKey" | "isPlaceholder"> & {
  attendanceId: string;
  source: AttendanceSource;
  version: number;
};

export type FetchAttendanceBoardParams = {
  branchId: string;
  businessDate: string;
  shiftCode: AttendanceShiftCode;
  role?: AttendanceRole | null;
  status?: AttendanceStatus | null;
  q?: string | null;
};

export type AttendanceHistoryParams = {
  branchId: string;
  staffId: string;
  limit?: number;
};

export type AttendanceCheckInPayload = {
  branchId: string;
  businessDate: string;
  shiftCode: AttendanceShiftCode;
  performedAt: string;
  note: string;
};

export type AttendanceCheckOutPayload = {
  branchId: string;
  performedAt: string;
  note: string;
  expectedVersion?: number | null;
};

export type AttendanceMarkAbsentPayload = {
  branchId: string;
  businessDate: string;
  shiftCode: AttendanceShiftCode;
  note: string;
};

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeBoardRow(raw: any): AttendanceBoardRow {
  return {
    rowKey: String(raw?.rowKey ?? raw?.row_key ?? ""),
    attendanceId: toNullableString(raw?.attendanceId ?? raw?.attendance_id),
    branchId: String(raw?.branchId ?? raw?.branch_id ?? ""),
    staffId: String(raw?.staffId ?? raw?.staff_id ?? ""),
    staffName: toNullableString(raw?.staffName ?? raw?.staff_name ?? raw?.fullName ?? raw?.full_name),
    username: String(raw?.username ?? ""),
    staffRole: String(raw?.staffRole ?? raw?.staff_role ?? ""),
    staffStatus: String(raw?.staffStatus ?? raw?.staff_status ?? ""),
    businessDate: String(raw?.businessDate ?? raw?.business_date ?? ""),
    shiftCode: String(raw?.shiftCode ?? raw?.shift_code ?? "MORNING").toUpperCase() as AttendanceShiftCode,
    shiftName: String(raw?.shiftName ?? raw?.shift_name ?? ""),
    startTime: String(raw?.startTime ?? raw?.start_time ?? ""),
    endTime: String(raw?.endTime ?? raw?.end_time ?? ""),
    crossesMidnight: Boolean(raw?.crossesMidnight ?? raw?.crosses_midnight),
    scheduledStartAt: String(raw?.scheduledStartAt ?? raw?.scheduled_start_at ?? ""),
    scheduledEndAt: String(raw?.scheduledEndAt ?? raw?.scheduled_end_at ?? ""),
    checkInAt: toNullableString(raw?.checkInAt ?? raw?.check_in_at),
    checkOutAt: toNullableString(raw?.checkOutAt ?? raw?.check_out_at),
    status: String(raw?.status ?? "NOT_CHECKED_IN").toUpperCase() as AttendanceStatus,
    source: toNullableString(raw?.source)?.toUpperCase() as AttendanceSource | null,
    note: toNullableString(raw?.note),
    lateMinutes: toNumber(raw?.lateMinutes ?? raw?.late_minutes),
    earlyLeaveMinutes: toNumber(raw?.earlyLeaveMinutes ?? raw?.early_leave_minutes),
    workedMinutes:
      raw?.workedMinutes == null && raw?.worked_minutes == null
        ? null
        : toNumber(raw?.workedMinutes ?? raw?.worked_minutes),
    isCorrected: Boolean(raw?.isCorrected ?? raw?.is_corrected),
    lastCorrectedAt: toNullableString(raw?.lastCorrectedAt ?? raw?.last_corrected_at),
    lastCorrectedByType: toNullableString(raw?.lastCorrectedByType ?? raw?.last_corrected_by_type),
    lastCorrectedById: toNullableString(raw?.lastCorrectedById ?? raw?.last_corrected_by_id),
    version:
      raw?.version == null
        ? null
        : toNumber(raw?.version),
    isOpen: Boolean(raw?.isOpen ?? raw?.is_open),
    isPlaceholder: Boolean(raw?.isPlaceholder ?? raw?.is_placeholder),
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ""),
  };
}

function normalizeRecord(raw: any): AttendanceRecord {
  const row = normalizeBoardRow(raw);
  return {
    ...row,
    attendanceId: String(row.attendanceId ?? ""),
    source: (row.source ?? "MANAGER_MANUAL") as AttendanceSource,
    version: row.version ?? 1,
  };
}

export async function fetchAttendanceBoard(
  params: FetchAttendanceBoardParams,
): Promise<AttendanceBoardPayload> {
  const query = new URLSearchParams();
  query.set("branchId", params.branchId);
  query.set("businessDate", params.businessDate);
  query.set("shiftCode", params.shiftCode);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  if (params.q && params.q.trim()) query.set("q", params.q.trim());

  const raw = await apiFetchAuthed<any>(`/admin/attendance?${query.toString()}`);
  return {
    branchId: String(raw?.branchId ?? raw?.branch_id ?? params.branchId),
    businessDate: String(raw?.businessDate ?? raw?.business_date ?? params.businessDate),
    shiftCode: String(raw?.shiftCode ?? raw?.shift_code ?? params.shiftCode).toUpperCase() as AttendanceShiftCode,
    shiftName: String(raw?.shiftName ?? raw?.shift_name ?? params.shiftCode),
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeBoardRow) : [],
  };
}

export async function fetchStaffAttendanceHistory(
  params: AttendanceHistoryParams,
): Promise<AttendanceRecord[]> {
  const query = new URLSearchParams();
  query.set("branchId", params.branchId);
  if (params.limit != null) query.set("limit", String(params.limit));

  const raw = await apiFetchAuthed<any>(
    `/admin/attendance/staff/${encodeURIComponent(params.staffId)}/history?${query.toString()}`,
  );
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items.map(normalizeRecord);
}

export async function manualAttendanceCheckIn(
  staffId: string,
  payload: AttendanceCheckInPayload,
  idempotencyKey?: string,
): Promise<AttendanceRecord> {
  const raw = await apiFetchAuthed<any>(`/admin/attendance/${encodeURIComponent(staffId)}/check-in`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeRecord(raw);
}

export async function manualAttendanceCheckOut(
  attendanceId: string,
  payload: AttendanceCheckOutPayload,
  idempotencyKey?: string,
): Promise<AttendanceRecord> {
  const raw = await apiFetchAuthed<any>(`/admin/attendance/${encodeURIComponent(attendanceId)}/check-out`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeRecord(raw);
}

export async function markAttendanceAbsent(
  staffId: string,
  payload: AttendanceMarkAbsentPayload,
  idempotencyKey?: string,
): Promise<AttendanceRecord> {
  const raw = await apiFetchAuthed<any>(`/admin/attendance/${encodeURIComponent(staffId)}/mark-absent`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeRecord(raw);
}
