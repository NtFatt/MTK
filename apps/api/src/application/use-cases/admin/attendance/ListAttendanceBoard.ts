import type {
  AttendanceBoardRow,
  AttendanceStatus,
  IAttendanceRepository,
} from "../../../ports/repositories/IAttendanceRepository.js";
import type { IStaffUserRepository, StaffUserRole } from "../../../ports/repositories/IStaffUserRepository.js";
import { getShiftTemplate, type ShiftCode } from "../../../../domain/shifts/templates.js";

function buildPlaceholderRow(input: {
  branchId: string;
  businessDate: string;
  shiftCode: ShiftCode;
  staff: {
    staffId: string;
    fullName: string | null;
    username: string;
    role: string;
    status: string;
  };
}): AttendanceBoardRow {
  const template = getShiftTemplate(input.shiftCode);
  if (!template) throw new Error("SHIFT_TEMPLATE_INVALID");

  const scheduledStart = new Date(`${input.businessDate}T${template.startTime}`);
  const scheduledEnd = new Date(`${input.businessDate}T${template.endTime}`);
  if (template.crossesMidnight) {
    scheduledEnd.setDate(scheduledEnd.getDate() + 1);
  }

  return {
    rowKey: `${input.businessDate}:${input.shiftCode}:${input.staff.staffId}`,
    attendanceId: null,
    branchId: input.branchId,
    staffId: input.staff.staffId,
    staffName: input.staff.fullName,
    username: input.staff.username,
    staffRole: input.staff.role,
    staffStatus: input.staff.status,
    businessDate: input.businessDate,
    shiftCode: input.shiftCode,
    shiftName: template.name,
    startTime: template.startTime,
    endTime: template.endTime,
    crossesMidnight: template.crossesMidnight,
    scheduledStartAt: scheduledStart.toISOString(),
    scheduledEndAt: scheduledEnd.toISOString(),
    checkInAt: null,
    checkOutAt: null,
    status: "NOT_CHECKED_IN",
    source: null,
    note: null,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    workedMinutes: null,
    isCorrected: false,
    lastCorrectedAt: null,
    lastCorrectedByType: null,
    lastCorrectedById: null,
    version: null,
    isOpen: false,
    isPlaceholder: true,
    createdAt: scheduledStart.toISOString(),
    updatedAt: scheduledStart.toISOString(),
  };
}

function normalizeStatus(value: string | null | undefined): AttendanceStatus | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  const allowed = new Set<AttendanceStatus>([
    "NOT_CHECKED_IN",
    "PRESENT",
    "LATE",
    "EARLY_LEAVE",
    "MISSING_CHECKOUT",
    "ABSENT",
    "ON_LEAVE",
    "CORRECTED",
  ]);
  return allowed.has(normalized as AttendanceStatus) ? (normalized as AttendanceStatus) : null;
}

export class ListAttendanceBoard {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly staffRepo: IStaffUserRepository,
  ) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    role?: StaffUserRole | null;
    status?: string | null;
    q?: string | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    const q = String(input.q ?? "").trim().toLowerCase();
    const statusFilter = normalizeStatus(input.status);
    const activeStaff = await this.staffRepo.list({
      branchId: scopedBranchId,
      status: "ACTIVE",
    });

    const filteredStaff = activeStaff.filter((staff) => {
      if (input.role && staff.role !== input.role) return false;
      if (!q) return true;
      return (
        String(staff.username ?? "").toLowerCase().includes(q) ||
        String(staff.fullName ?? "").toLowerCase().includes(q) ||
        String(staff.staffId ?? "").toLowerCase().includes(q)
      );
    });

    const records = await this.attendanceRepo.listRecordsForShift({
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      staffIds: filteredStaff.map((staff) => staff.staffId),
    });

    const byStaffId = new Map(records.map((record) => [record.staffId, record]));
    const items = filteredStaff
      .map<AttendanceBoardRow>((staff) => {
        const record = byStaffId.get(staff.staffId);
        if (record) {
          return {
            ...record,
            rowKey: `${input.businessDate}:${input.shiftCode}:${staff.staffId}`,
            attendanceId: record.attendanceId,
            source: record.source,
            version: record.version,
            isPlaceholder: false,
          };
        }

        return buildPlaceholderRow({
          branchId: scopedBranchId,
          businessDate: input.businessDate,
          shiftCode: input.shiftCode,
          staff: {
            staffId: staff.staffId,
            fullName: staff.fullName,
            username: staff.username,
            role: staff.role,
            status: staff.status,
          },
        });
      })
      .filter((row) => (statusFilter ? row.status === statusFilter : true))
      .sort((a, b) => {
        const nameA = String(a.staffName ?? a.username).toLowerCase();
        const nameB = String(b.staffName ?? b.username).toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB, "vi");
        return a.staffId.localeCompare(b.staffId);
      });

    const template = getShiftTemplate(input.shiftCode);
    return {
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      shiftName: template?.name ?? input.shiftCode,
      items,
    };
  }
}
