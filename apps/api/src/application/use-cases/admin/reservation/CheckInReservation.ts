import type { ITableReservationRepository } from "../../../ports/repositories/ITableReservationRepository.js";
import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";
import type { ITableSessionRepository } from "../../../ports/repositories/ITableSessionRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../../ports/events/NoopEventBus.js";
import { addMinutes } from "../../reservation/reservationTime.js";

export class CheckInReservation {
  constructor(
    private reservationRepo: ITableReservationRepository,
    private tableRepo: ITableRepository,
    private sessionRepo: ITableSessionRepository,
    private cfg: { earlyMinutes: number; lateMinutes: number } = { earlyMinutes: 30, lateMinutes: 15 },
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(input: {
    reservationCode: string;
    actor: { actorType: "ADMIN" | "STAFF"; branchId: string | null };
  }) {
    const reservationCode = input.reservationCode;
    const now = new Date();
    await this.reservationRepo.expirePending(now);

    const r = await this.reservationRepo.findByCode(reservationCode);
    if (!r) throw new Error("RESERVATION_NOT_FOUND");
    // Branch-scope guard (pro-grade): STAFF tokens are restricted to their branch.
    // Validate table early so every path (including already CHECKED_IN) is scoped.
    const tableEarly = await this.tableRepo.findById(r.tableId);
    if (!tableEarly) throw new Error("TABLE_NOT_FOUND");
    const branchIdEarly = tableEarly.branchId ?? null;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      if (!branchIdEarly || String(branchIdEarly) !== String(input.actor.branchId)) {
        throw new Error("FORBIDDEN");
      }
    }

    if (r.status === "EXPIRED") throw new Error("RESERVATION_EXPIRED");
    if (r.status === "CANCELED") throw new Error("RESERVATION_CANCELED");

    if (r.status !== "CONFIRMED" && r.status !== "CHECKED_IN") {
      throw new Error("RESERVATION_NOT_CONFIRMED");
    }

    // If already checked in, return existing session
    if (r.status === "CHECKED_IN" && r.sessionId) {
      const s = await this.sessionRepo.findOpenByTableId(r.tableId);
      if (s) return { reservation: r, session: s };
    }

    // Time window: [from - cfg.earlyMinutes, to + cfg.lateMinutes]
    const fromOk = addMinutes(r.reservedFrom, -this.cfg.earlyMinutes);
    const toOk = addMinutes(r.reservedTo, this.cfg.lateMinutes);
    if (now.getTime() < fromOk.getTime() || now.getTime() > toOk.getTime()) {
      throw new Error("RESERVATION_NOT_IN_TIME_WINDOW");
    }

    // If there is already an open session for the table, link and return
    const existingSession = await this.sessionRepo.findOpenByTableId(r.tableId);
    if (existingSession) {
      await this.reservationRepo.markCheckedIn(reservationCode, String(existingSession.id), now);
      const updated = await this.reservationRepo.findByCode(reservationCode);
      if (!updated) throw new Error("RESERVATION_NOT_FOUND");

      const table = await this.tableRepo.findById(updated.tableId);
      const branchId = table?.branchId ?? null;

      await this.eventBus.publish({
        type: "reservation.status.changed",
        at: new Date().toISOString(),
        scope: { reservationId: updated.id, tableId: updated.tableId, sessionId: existingSession.id, branchId },
        payload: {
          reservationCode: updated.reservationCode,
          toStatus: updated.status,
          checkedInAt: updated.checkedInAt ? updated.checkedInAt.toISOString() : null,
          sessionId: existingSession.id,
        },
      });

      return { reservation: updated, session: existingSession };
    }

    // Ensure table exists and is not out of service
    const table = await this.tableRepo.findById(r.tableId);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    if (table.status === "OUT_OF_SERVICE") throw new Error("TABLE_OUT_OF_SERVICE");

    // Occupy + open session
    await this.tableRepo.updateStatus(r.tableId, "OCCUPIED");
    const session = await this.sessionRepo.create(r.tableId);

    await this.reservationRepo.markCheckedIn(reservationCode, String(session.id), now);
    const updated = await this.reservationRepo.findByCode(reservationCode);
    if (!updated) throw new Error("RESERVATION_NOT_FOUND");

    const branchId = table.branchId ?? null;

    // Notify realtime subscribers
    await this.eventBus.publish({
      type: "table.session.opened",
      at: new Date().toISOString(),
      scope: { sessionId: session.id, sessionKey: session.sessionKey, tableId: r.tableId, branchId },
      payload: { sessionId: session.id, sessionKey: session.sessionKey, tableId: r.tableId },
    });

    await this.eventBus.publish({
      type: "reservation.status.changed",
      at: new Date().toISOString(),
      scope: { reservationId: updated.id, tableId: updated.tableId, sessionId: session.id, branchId },
      payload: {
        reservationCode: updated.reservationCode,
        toStatus: updated.status,
        checkedInAt: updated.checkedInAt ? updated.checkedInAt.toISOString() : null,
        sessionId: session.id,
      },
    });

    return { reservation: updated, session };
  }
}
