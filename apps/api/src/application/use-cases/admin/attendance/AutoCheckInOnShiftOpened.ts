import type { IAttendanceRepository } from "../../../ports/repositories/IAttendanceRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";
import type { DomainEvent } from "../../../ports/events/DomainEvent.js";
import type { ShiftCode } from "../../../../domain/shifts/templates.js";
import { log } from "../../../../infrastructure/observability/logger.js";

export class AutoCheckInOnShiftOpened {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly eventBus: IEventBus,
  ) {}

  handler = async (event: DomainEvent) => {
    if (event.type !== "shift.opened") return;

    const { branchId, businessDate, shiftCode, openedBy } = event.payload ?? {};
    if (!branchId || !businessDate || !shiftCode || !openedBy) return;

    try {
      const record = await this.attendanceRepo.autoCheckInFromShift({
        branchId: String(branchId),
        staffId: String(openedBy.userId),
        businessDate: String(businessDate),
        shiftCode: String(shiftCode).toUpperCase() as ShiftCode,
        performedAt: event.at,
        actor: {
          actorType: String(openedBy.actorType ?? "STAFF").toUpperCase() as "ADMIN" | "STAFF",
          actorId: String(openedBy.userId),
          actorName: String(openedBy.username ?? ""),
        },
      });

      if (record) {
        await this.eventBus.publish({
          type: "attendance.changed",
          at: event.at,
          scope: { branchId },
          payload: {
            attendanceId: record.attendanceId,
            staffId: record.staffId,
            businessDate: record.businessDate,
            shiftCode: record.shiftCode,
            status: record.status,
          },
        });
      }

      log.info("auto_checkin_from_shift", {
        branchId,
        staffId: openedBy.userId,
        businessDate,
        shiftCode,
      });
    } catch (e: any) {
      log.warn("auto_checkin_from_shift_failed", {
        branchId,
        staffId: openedBy.userId,
        businessDate,
        shiftCode,
        error: e?.message,
      });
    }
  };
}
