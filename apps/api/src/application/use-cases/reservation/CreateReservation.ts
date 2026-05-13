import crypto from "node:crypto";
import type { ITableReservationRepository, TableSlot } from "../../ports/repositories/ITableReservationRepository.js";
import { addDays, addMinutes, assertValidDate, clampDate } from "./reservationTime.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

export class CreateReservation {
  constructor(
    private reservationRepo: ITableReservationRepository,
    private cfg: { maxDays: number; pendingMinutes: number } = { maxDays: 7, pendingMinutes: 45 },
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(input: {
    branchId: string;
    areaName: string;
    partySize: number;
    contactPhone: string;
    contactName?: string | null;
    note?: string | null;
    reservedFrom: Date;
    reservedTo: Date;
    tableId?: string;
  }) {
    const now = new Date();
    await this.reservationRepo.expirePending(now);

    if (!input.areaName || input.areaName.trim().length === 0) throw new Error("AREA_REQUIRED");
    if (!Number.isFinite(input.partySize) || input.partySize <= 0) throw new Error("PARTY_SIZE_INVALID");
    if (!input.contactPhone || input.contactPhone.trim().length === 0) throw new Error("PHONE_REQUIRED");

    assertValidDate(input.reservedFrom, "INVALID_RESERVED_FROM");
    assertValidDate(input.reservedTo, "INVALID_RESERVED_TO");

    if (input.reservedTo.getTime() <= input.reservedFrom.getTime()) throw new Error("INVALID_RESERVATION_TIME");
    if (input.reservedFrom.getTime() < now.getTime()) throw new Error("RESERVATION_IN_PAST");

    const max = addDays(now, this.cfg.maxDays);
    if (input.reservedFrom.getTime() > max.getTime() || input.reservedTo.getTime() > max.getTime()) {
      throw new Error("RESERVATION_TOO_FAR");
    }

    const avail = await this.reservationRepo.getAvailability({
      branchId: input.branchId,
      areaName: input.areaName.trim(),
      partySize: input.partySize,
      reservedFrom: input.reservedFrom,
      reservedTo: input.reservedTo,
      now,
    });

    if (!avail.available) throw new Error("NO_TABLE_AVAILABLE");

    let selectedTable: TableSlot;
    if (input.tableId) {
      const slot = await this.reservationRepo.findTableSlotById(
        input.branchId,
        input.areaName.trim(),
        input.tableId,
      );
      if (!slot) throw new Error("SELECTED_TABLE_NOT_FOUND");
      if (!avail.availableTables.some((t) => t.tableId === slot.tableId)) {
        throw new Error("SELECTED_TABLE_NOT_AVAILABLE");
      }
      selectedTable = slot;
    } else {
      if (!avail.suggestedTable) throw new Error("NO_TABLE_AVAILABLE");
      selectedTable = avail.suggestedTable;
    }

    const expiresAt = clampDate(addMinutes(now, this.cfg.pendingMinutes), input.reservedFrom);
    const reservationCode = this.generateCode();

    const created = await this.reservationRepo.createPending(reservationCode, {
      areaName: input.areaName.trim(),
      partySize: input.partySize,
      contactPhone: input.contactPhone.trim(),
      contactName: input.contactName?.trim() ? input.contactName.trim() : null,
      note: input.note?.trim() ? input.note.trim() : null,
      reservedFrom: input.reservedFrom,
      reservedTo: input.reservedTo,
      expiresAt,
      tableId: selectedTable.tableId,
      tableCodeSnapshot: selectedTable.tableCode,
      areaNameSnapshot: selectedTable.areaName,
    });

    await this.eventBus.publish({
      type: "reservation.created",
      at: new Date().toISOString(),
      scope: { reservationId: created.id, tableId: created.tableId, branchId: selectedTable.branchId },
      payload: {
        reservationCode: created.reservationCode,
        status: created.status,
        tableCode: created.tableCodeSnapshot,
        area: created.areaNameSnapshot,
        partySize: created.partySize,
        reservedFrom: created.reservedFrom.toISOString(),
        reservedTo: created.reservedTo.toISOString(),
        expiresAt: created.expiresAt?.toISOString() ?? null,
      },
    });

    return created;
  }

  private generateCode(): string {
    const raw = crypto.randomBytes(8).toString("hex").toUpperCase();
    return `RSV${raw.slice(0, 9)}`;
  }
}
