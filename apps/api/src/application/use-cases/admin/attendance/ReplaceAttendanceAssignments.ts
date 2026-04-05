import type { IEventBus } from "../../../ports/events/IEventBus.js";
import type { IStaffShiftAssignmentRepository } from "../../../ports/repositories/IStaffShiftAssignmentRepository.js";
import type { IStaffUserRepository } from "../../../ports/repositories/IStaffUserRepository.js";
import type { ShiftCode } from "../../../../domain/shifts/templates.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

function normalizeStaffIds(staffIds: string[]): string[] {
  return Array.from(
    new Set(
      (staffIds ?? [])
        .map((staffId) => String(staffId ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export class ReplaceAttendanceAssignments {
  constructor(
    private readonly assignmentRepo: IStaffShiftAssignmentRepository,
    private readonly staffRepo: IStaffUserRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    const normalizedStaffIds = normalizeStaffIds(input.staffIds);
    const staffRows = normalizedStaffIds.length
      ? await this.staffRepo.findManyByIds(normalizedStaffIds)
      : [];
    const staffById = new Map(staffRows.map((staff) => [staff.staffId, staff]));

    for (const staffId of normalizedStaffIds) {
      const staff = staffById.get(staffId);
      if (!staff) throw new Error("STAFF_NOT_FOUND");
      if (String(staff.branchId ?? "") !== scopedBranchId) {
        const err: any = new Error("STAFF_BRANCH_MISMATCH");
        err.status = 409;
        err.code = "STAFF_BRANCH_MISMATCH";
        err.details = { staffId, branchId: scopedBranchId };
        throw err;
      }
      if (staff.status !== "ACTIVE") throw new Error("STAFF_NOT_ACTIVE");
    }

    const items = await this.assignmentRepo.replaceAssignmentsForShift({
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      staffIds: normalizedStaffIds,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
        actorName: input.actor.username,
      },
    });

    await this.eventBus.publish({
      type: "attendance.schedule.changed",
      at: new Date().toISOString(),
      scope: {
        branchId: scopedBranchId,
      },
      payload: {
        branchId: scopedBranchId,
        businessDate: input.businessDate,
        shiftCode: input.shiftCode,
        staffIds: items.map((item) => item.staffId),
      },
    });

    return {
      branchId: scopedBranchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      count: items.length,
      staffIds: items.map((item) => item.staffId),
      items,
    };
  }
}
