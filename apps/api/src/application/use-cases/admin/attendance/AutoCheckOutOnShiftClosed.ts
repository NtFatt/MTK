import type { IAttendanceRepository } from "../../../ports/repositories/IAttendanceRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";
import type { DomainEvent } from "../../../ports/events/DomainEvent.js";
import type { ShiftCode } from "../../../../domain/shifts/templates.js";
import { log } from "../../../../infrastructure/observability/logger.js";

export class AutoCheckOutOnShiftClosed {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly eventBus: IEventBus,
  ) {}

  handler = async (event: DomainEvent) => {
    if (event.type !== "shift.closed") return;

    const { branchId, businessDate, shiftCode, closedBy } = event.payload ?? {};
    if (!branchId || !businessDate || !shiftCode) return;

    try {
      const count = await this.attendanceRepo.autoCheckOutOpenRecords({
        branchId: String(branchId),
        businessDate: String(businessDate),
        shiftCode: String(shiftCode).toUpperCase() as ShiftCode,
        performedAt: event.at,
        actor: {
          actorType: String(closedBy?.actorType ?? "STAFF").toUpperCase() as "ADMIN" | "STAFF",
          actorId: String(closedBy?.userId ?? ""),
          actorName: String(closedBy?.username ?? ""),
        },
      });

      if (count > 0) {
        await this.eventBus.publish({
          type: "attendance.changed",
          at: event.at,
          scope: { branchId },
          payload: {
            businessDate: businessDate,
            shiftCode: shiftCode,
            action: "batch_checkout",
          },
        });
      }

      log.info("auto_checkout_from_shift", {
        branchId,
        businessDate,
        shiftCode,
        checkedOut: count,
      });
    } catch (e: any) {
      log.warn("auto_checkout_from_shift_failed", {
        branchId,
        businessDate,
        shiftCode,
        error: e?.message,
      });
    }
  };
}
