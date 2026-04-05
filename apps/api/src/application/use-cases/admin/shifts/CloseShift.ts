import type { IEventBus } from "../../../ports/events/IEventBus.js";
import type { IShiftRepository, ShiftBreakdownInput } from "../../../ports/repositories/IShiftRepository.js";
import type { IStaffShiftAssignmentRepository } from "../../../ports/repositories/IStaffShiftAssignmentRepository.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class CloseShift {
  constructor(
    private readonly shiftRepo: IShiftRepository,
    private readonly assignmentRepo: IStaffShiftAssignmentRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    shiftRunId: string;
    branchId: string;
    countedBreakdown: ShiftBreakdownInput[];
    note?: string | null;
    expectedVersion?: number | null;
  }) {
    const branchId = String(input.branchId ?? "").trim();
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    if (
      input.actor.actorType === "STAFF" &&
      input.actor.branchId &&
      String(input.actor.branchId) !== branchId
    ) {
      throw new Error("FORBIDDEN");
    }

    const actorRole = String(input.actor.role ?? "").toUpperCase();
    if (input.actor.actorType === "STAFF" && actorRole !== "BRANCH_MANAGER") {
      const shift = await this.shiftRepo.getById({
        shiftRunId: input.shiftRunId,
        branchId,
      });
      if (!shift) throw new Error("SHIFT_NOT_FOUND");

      const assignment = await this.assignmentRepo.findForStaffShift({
        branchId,
        staffId: input.actor.userId,
        businessDate: shift.businessDate,
        shiftCode: shift.shiftCode,
      });
      if (!assignment) {
        const err: any = new Error("SHIFT_NOT_ASSIGNED_TO_ACTOR");
        err.status = 409;
        err.code = "SHIFT_NOT_ASSIGNED_TO_ACTOR";
        err.details = {
          branchId,
          businessDate: shift.businessDate,
          shiftCode: shift.shiftCode,
          staffId: input.actor.userId,
        };
        throw err;
      }
    }

    const closed = await this.shiftRepo.closeShift({
      shiftRunId: input.shiftRunId,
      branchId,
      countedBreakdown: input.countedBreakdown,
      note: input.note ?? null,
      expectedVersion: input.expectedVersion ?? null,
      actor: {
        userId: input.actor.userId,
        name: input.actor.username,
      },
    });

    await this.eventBus.publish({
      type: "shift.closed",
      at: new Date().toISOString(),
      scope: {
        branchId,
      },
      payload: {
        shiftRunId: closed.shiftRunId,
        branchId,
        shiftCode: closed.shiftCode,
        businessDate: closed.businessDate,
        variance: closed.variance,
        closedBy: {
          userId: input.actor.userId,
          username: input.actor.username,
          actorType: input.actor.actorType,
        },
      },
    });

    return closed;
  }
}
