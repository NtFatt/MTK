import type { ITableRepository } from "../../ports/repositories/ITableRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { ITableReservationRepository } from "../../ports/repositories/ITableReservationRepository.js";
import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";
import type { IStockHoldService } from "../../ports/services/IStockHoldService.js";
import { NoopStockHoldService } from "../../ports/services/NoopStockHoldService.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";

export class CloseTableSession {
  constructor(
    private tableRepo: ITableRepository,
    private sessionRepo: ITableSessionRepository,
    private reservationRepo: ITableReservationRepository,
    private lockAheadMinutes: number = 30,
    private eventBus: IEventBus = new NoopEventBus(),
    private cartRepo: ICartRepository | null = null,
    private stockHold: IStockHoldService = new NoopStockHoldService(),
  ) {}

  async execute(sessionKey: string) {
    const now = new Date();
    const session = await this.sessionRepo.closeBySessionKey(sessionKey, now);
    if (!session) return null;

    // Complete any CHECKED_IN reservation tied to this session.
    await this.reservationRepo.completeBySessionId(session.id, now);

    // If there's an ACTIVE cart on this session, mark ABANDONED and release stock holds.
    if (this.cartRepo) {
      try {
        const cart = await this.cartRepo.findActiveBySessionId(session.id);
        if (cart) {
          try {
            await this.cartRepo.markAbandoned(cart.id);
          } catch {
            // ignore
          }
          try {
            await this.stockHold.releaseCart(cart.cartKey);
          } catch {
            // ignore
          }

          await this.eventBus.publish({
            type: "cart.abandoned",
            at: new Date().toISOString(),
            scope: {
              sessionId: session.id,
              sessionKey: session.sessionKey,
              clientId: cart.clientId ?? null,
              branchId: cart.branchId ?? null,
            },
            payload: {
              cartKey: cart.cartKey,
              cartId: cart.id,
              sessionId: session.id,
              reason: "SESSION_CLOSED",
            },
          });
        }
      } catch {
        // ignore
      }
    }

    // Sync table status
    const table = await this.tableRepo.findById(session.tableId);
    if (!table) {
      await this.eventBus.publish({
        type: "table.session.closed",
        at: new Date().toISOString(),
        scope: { sessionId: session.id, sessionKey: session.sessionKey, tableId: session.tableId },
        payload: { sessionId: session.id, sessionKey: session.sessionKey, tableId: session.tableId },
      });
      return { session, tableStatus: null };
    }

    if (table.status === "OUT_OF_SERVICE") {
      await this.eventBus.publish({
        type: "table.session.closed",
        at: new Date().toISOString(),
        scope: { sessionId: session.id, sessionKey: session.sessionKey, tableId: session.tableId, branchId: table.branchId ?? null },
        payload: { sessionId: session.id, sessionKey: session.sessionKey, tableId: session.tableId, tableStatus: "OUT_OF_SERVICE", branchId: table.branchId ?? null },
      });
      return { session, tableStatus: "OUT_OF_SERVICE" as const };
    }

    const shouldReserve = await this.reservationRepo.hasConfirmedStartingSoon(session.tableId, now, this.lockAheadMinutes);
    const nextStatus = shouldReserve ? "RESERVED" : "AVAILABLE";

    if (table.status !== nextStatus) {
      await this.tableRepo.updateStatus(session.tableId, nextStatus);
    }

    await this.eventBus.publish({
      type: "table.session.closed",
      at: new Date().toISOString(),
      scope: { sessionId: session.id, sessionKey: session.sessionKey, tableId: session.tableId, branchId: table.branchId ?? null },
      payload: { sessionId: session.id, sessionKey: session.sessionKey, tableId: session.tableId, tableStatus: nextStatus, branchId: table.branchId ?? null },
    });

    return { session, tableStatus: nextStatus };
  }
}
