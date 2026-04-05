import type { IStaffShiftAssignmentRepository } from "../../../ports/repositories/IStaffShiftAssignmentRepository.js";
import type { IStaffUserRepository, StaffUserRole, StaffUserRecord } from "../../../ports/repositories/IStaffUserRepository.js";

export class ListAttendanceAssignments {
  constructor(
    private readonly assignmentRepo: IStaffShiftAssignmentRepository,
    private readonly staffRepo: IStaffUserRepository,
  ) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    businessDate: string;
    role?: StaffUserRole | null;
    q?: string | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    const q = String(input.q ?? "").trim().toLowerCase();
    const activeStaff = await this.staffRepo.list({
      branchId: scopedBranchId,
      status: "ACTIVE",
    });
    const assignments = await this.assignmentRepo.listForDate({
      branchId: scopedBranchId,
      businessDate: input.businessDate,
    });

    const activeStaffIds = new Set(activeStaff.map((staff) => staff.staffId));
    const extraStaffIds = Array.from(
      new Set(assignments.map((assignment) => assignment.staffId).filter((staffId) => !activeStaffIds.has(staffId))),
    );
    const extraStaff = extraStaffIds.length ? await this.staffRepo.findManyByIds(extraStaffIds) : [];

    const assignmentMap = new Map<string, Map<"MORNING" | "EVENING", string>>();
    for (const assignment of assignments) {
      const bucket =
        assignmentMap.get(assignment.staffId) ??
        new Map<"MORNING" | "EVENING", string>();
      bucket.set(assignment.shiftCode, assignment.assignmentId);
      assignmentMap.set(assignment.staffId, bucket);
    }

    const staffRows = [...activeStaff, ...extraStaff]
      .filter((staff, index, rows) => rows.findIndex((row) => row.staffId === staff.staffId) === index)
      .filter((staff) => {
        if (input.role && staff.role !== input.role) return false;
        if (!q) return true;
        return (
          String(staff.username ?? "").toLowerCase().includes(q) ||
          String(staff.fullName ?? "").toLowerCase().includes(q) ||
          String(staff.staffId ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const nameA = String(a.fullName ?? a.username).toLowerCase();
        const nameB = String(b.fullName ?? b.username).toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB, "vi");
        return a.staffId.localeCompare(b.staffId);
      });

    const items = staffRows.map((staff) => {
      const shifts = assignmentMap.get(staff.staffId);
      const morningAssignmentId = shifts?.get("MORNING") ?? null;
      const eveningAssignmentId = shifts?.get("EVENING") ?? null;
      return {
        staffId: staff.staffId,
        staffName: staff.fullName,
        username: staff.username,
        staffRole: staff.role,
        staffStatus: staff.status,
        isInactiveButAssigned:
          staff.status !== "ACTIVE" && (morningAssignmentId != null || eveningAssignmentId != null),
        morningAssigned: morningAssignmentId != null,
        morningAssignmentId,
        eveningAssigned: eveningAssignmentId != null,
        eveningAssignmentId,
      };
    });

    const assignedStaffIds = new Set(assignments.map((assignment) => assignment.staffId));
    return {
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      summary: {
        totalStaff: staffRows.length,
        assignedStaffCount: assignedStaffIds.size,
        morningAssignedCount: assignments.filter((assignment) => assignment.shiftCode === "MORNING").length,
        eveningAssignedCount: assignments.filter((assignment) => assignment.shiftCode === "EVENING").length,
      },
      items,
    };
  }
}
