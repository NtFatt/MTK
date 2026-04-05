import type {
  AttendanceBoardRow,
  AttendanceStatus,
  IAttendanceRepository,
} from "../../../ports/repositories/IAttendanceRepository.js";
import type {
  IStaffShiftAssignmentRepository,
  StaffShiftAssignmentView,
} from "../../../ports/repositories/IStaffShiftAssignmentRepository.js";
import type { IStaffUserRepository, StaffUserRole } from "../../../ports/repositories/IStaffUserRepository.js";
import { getShiftTemplate, type ShiftCode } from "../../../../domain/shifts/templates.js";

function buildPlaceholderRow(input: {
  branchId: string;
  businessDate: string;
  shiftCode: ShiftCode;
  assignmentId: string | null;
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
    isScheduled: true,
    assignmentId: input.assignmentId,
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
    private readonly assignmentRepo: IStaffShiftAssignmentRepository,
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
    const assignments = await this.assignmentRepo.listForShift({
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
    });

    const records = await this.attendanceRepo.listRecordsForShift({
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      staffIds: null,
    });

    const activeStaffIds = new Set(activeStaff.map((staff) => staff.staffId));
    const extraStaffIds = Array.from(
      new Set(
        [...assignments.map((assignment) => assignment.staffId), ...records.map((record) => record.staffId)].filter(
          (staffId) => !activeStaffIds.has(staffId),
        ),
      ),
    );
    const extraStaff = extraStaffIds.length ? await this.staffRepo.findManyByIds(extraStaffIds) : [];

    const staffById = new Map(
      [...activeStaff, ...extraStaff].map((staff) => [staff.staffId, staff]),
    );
    const assignmentByStaffId = new Map<string, StaffShiftAssignmentView>(
      assignments.map((assignment) => [assignment.staffId, assignment]),
    );
    const recordByStaffId = new Map(records.map((record) => [record.staffId, record]));
    const candidateStaffIds = Array.from(
      new Set([...assignments.map((assignment) => assignment.staffId), ...records.map((record) => record.staffId)]),
    );

    const items = candidateStaffIds
      .map<AttendanceBoardRow>((staff) => {
        const record = recordByStaffId.get(staff);
        const assignment = assignmentByStaffId.get(staff);
        const staffRecord = staffById.get(staff);

        if (record) {
          return {
            ...record,
            staffName: staffRecord?.fullName ?? record.staffName,
            username: staffRecord?.username ?? record.username,
            staffRole: staffRecord?.role ?? record.staffRole,
            staffStatus: staffRecord?.status ?? record.staffStatus,
            rowKey: `${input.businessDate}:${input.shiftCode}:${record.staffId}`,
            attendanceId: record.attendanceId,
            source: record.source,
            version: record.version,
            isPlaceholder: false,
            isScheduled: Boolean(assignment),
            assignmentId: assignment?.assignmentId ?? null,
          };
        }

        if (!staffRecord || !assignment) {
          return {
            rowKey: `${input.businessDate}:${input.shiftCode}:${staff}`,
            attendanceId: null,
            branchId: scopedBranchId,
            staffId: staff,
            staffName: null,
            username: "",
            staffRole: "",
            staffStatus: "",
            businessDate: input.businessDate,
            shiftCode: input.shiftCode,
            shiftName: input.shiftCode,
            startTime: "00:00:00",
            endTime: "00:00:00",
            crossesMidnight: false,
            scheduledStartAt: new Date(`${input.businessDate}T00:00:00`).toISOString(),
            scheduledEndAt: new Date(`${input.businessDate}T00:00:00`).toISOString(),
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
            isScheduled: Boolean(assignment),
            assignmentId: assignment?.assignmentId ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        return buildPlaceholderRow({
          branchId: scopedBranchId,
          businessDate: input.businessDate,
          shiftCode: input.shiftCode,
          assignmentId: assignment.assignmentId,
          staff: {
            staffId: staffRecord.staffId,
            fullName: staffRecord.fullName,
            username: staffRecord.username,
            role: staffRecord.role,
            status: staffRecord.status,
          },
        });
      })
      .filter((row) => {
        if (input.role && row.staffRole !== input.role) return false;
        if (!q) return true;
        return (
          String(row.username ?? "").toLowerCase().includes(q) ||
          String(row.staffName ?? "").toLowerCase().includes(q) ||
          String(row.staffId ?? "").toLowerCase().includes(q)
        );
      })
      .filter((row) => (statusFilter ? row.status === statusFilter : true))
      .sort((a, b) => {
        if (a.isScheduled !== b.isScheduled) return a.isScheduled ? -1 : 1;
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
