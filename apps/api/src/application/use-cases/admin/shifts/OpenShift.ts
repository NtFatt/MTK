import type { IEventBus } from "../../../ports/events/IEventBus.js";
import type { IShiftRepository, ShiftBreakdownInput } from "../../../ports/repositories/IShiftRepository.js";
import type { ShiftCode } from "../../../../domain/shifts/templates.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class OpenShift {
  constructor(
    private readonly shiftRepo: IShiftRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    openingFloat: number;
    openingBreakdown: ShiftBreakdownInput[];
    note?: string | null;
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

    const created = await this.shiftRepo.openShift({
      branchId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      openingFloat: input.openingFloat,
      openingBreakdown: input.openingBreakdown,
      note: input.note ?? null,
      actor: {
        userId: input.actor.userId,
        name: input.actor.username,
      },
    });

    await this.eventBus.publish({
      type: "shift.opened",
      at: new Date().toISOString(),
      scope: {
        branchId,
      },
      payload: {
        shiftRunId: created.shiftRunId,
        branchId,
        shiftCode: created.shiftCode,
        businessDate: created.businessDate,
        openedBy: {
          userId: input.actor.userId,
          username: input.actor.username,
          actorType: input.actor.actorType,
        },
      },
    });

    return created;
  }
}
