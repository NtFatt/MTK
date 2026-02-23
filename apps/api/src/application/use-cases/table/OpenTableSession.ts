import type { ITableRepository } from "../../ports/repositories/ITableRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { ITableReservationRepository } from "../../ports/repositories/ITableReservationRepository.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

export class OpenTableSession {
  constructor(
    private tableRepo: ITableRepository,
    private sessionRepo: ITableSessionRepository,
    private reservationRepo: ITableReservationRepository,
    private lockAheadMinutes: number = 30,
    private eventBus: IEventBus = new NoopEventBus(),
  ) {}

  async execute(input: {
    directionId?: string;
    tableId?: string;
    clientId?: string | null;
  }) {
    const now = new Date();

    const directionId = input.directionId?.trim();
    const tableId = input.tableId?.trim();

    if (!directionId && !tableId) throw new Error("INVALID_DIRECTION_ID");

    const table = directionId
      ? await this.tableRepo.findByDirectionId(directionId)
      : await this.tableRepo.findById(tableId!);

    if (!table) throw new Error("TABLE_NOT_FOUND");
    if (table.status === "OUT_OF_SERVICE") throw new Error("TABLE_OUT_OF_SERVICE");

    // If already OCCUPIED and has active session, return it.
    const existing = await this.sessionRepo.findActiveByTableId(table.id);
    if (existing) {
      return {
        created: false,
        table,
        session: existing,
        tableStatus: table.status,
      };
    }

    // Lock / reserve policy (avoid opening session when table should be RESERVED soon)
    const shouldReserve = await this.reservationRepo.hasConfirmedStartingSoon(table.id, now, this.lockAheadMinutes);
    if (shouldReserve) throw new Error("TABLE_RESERVED_SOON");

    // Create new session
    const session = await this.sessionRepo.create(table.id, input.clientId ?? null);

    // Mark table OCCUPIED
    if (table.status !== "OCCUPIED") {
      await this.tableRepo.updateStatus(table.id, "OCCUPIED");
    }

    await this.eventBus.publish({
      type: "table.session.opened",
      at: new Date().toISOString(),
      scope: {
        sessionId: session.id,
        sessionKey: session.sessionKey,
        tableId: table.id,
        clientId: input.clientId ?? null,
        branchId: table.branchId ?? null,
      },
      payload: {
        sessionId: session.id,
        sessionKey: session.sessionKey,
        tableId: table.id,
        clientId: input.clientId ?? null,
        branchId: table.branchId ?? null,
      },
    });

    return {
      created: true,
      table,
      session,
      tableStatus: "OCCUPIED" as const,
    };
  }
}
