import type { IAttendanceRepository } from "../../../ports/repositories/IAttendanceRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class ManualAttendanceCheckOut {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    attendanceId: string;
    performedAt: string;
    note: string;
    expectedVersion?: number | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    const record = await this.attendanceRepo.manualCheckOut({
      branchId: scopedBranchId,
      attendanceId: input.attendanceId,
      performedAt: input.performedAt,
      note: input.note,
      expectedVersion: input.expectedVersion ?? null,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
        actorName: input.actor.username,
      },
    });

    await this.eventBus.publish({
      type: "attendance.changed",
      at: input.performedAt,
      scope: {
        branchId: record.branchId,
      },
      payload: {
        attendanceId: record.attendanceId,
        staffId: record.staffId,
        businessDate: record.businessDate,
        shiftCode: record.shiftCode,
        status: record.status,
      },
    });

    return record;
  }
}

