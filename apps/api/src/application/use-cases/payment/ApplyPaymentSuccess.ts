import type { IPaymentRepository } from "../../ports/repositories/IPaymentRepository.js";
import type { IOrderRepository, OrderStatusHistoryActor } from "../../ports/repositories/IOrderRepository.js";
import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import { NoopEventBus } from "../../ports/events/NoopEventBus.js";
import type { CloseTableSession } from "../table/CloseTableSession.js";

/**
 * Apply side-effects when a payment is confirmed SUCCESS.
 *
 * Enterprise rule: MUST be idempotent.
 * - IPN can be retried.
 * - RETURN can be reloaded.
 */
export class ApplyPaymentSuccess {
  constructor(
    private paymentRepo: IPaymentRepository,
    private orderRepo: IOrderRepository,
    private eventBus: IEventBus = new NoopEventBus(),
    private sessionRepo: ITableSessionRepository | null = null,
    private closeTableSession: CloseTableSession | null = null,
  ) {}

  async execute(
    txnRef: string,
    meta?: {
      provider?: string;
      /** Custom history note. If omitted, it is derived from provider + txnRef. */
      note?: string;
      changedBy?: { type: OrderStatusHistoryActor; id: string | null };
    },
  ): Promise<{
    orderCode: string;
    changed: boolean;
    fromStatus: string;
    toStatus: string;
  }> {
    const orderCode = await this.paymentRepo.findOrderCodeByTxnRef(txnRef);
    if (!orderCode) throw new Error("ORDER_NOT_FOUND");

    const provider = String(meta?.provider ?? "VNPAY");
    const changedByType = (meta?.changedBy?.type ?? "SYSTEM") as OrderStatusHistoryActor;
    const changedById = meta?.changedBy?.id ?? null;
    const historyNote = meta?.note ?? `Paid via ${provider} (txnRef=${txnRef})`;

    const r = await this.orderRepo.markPaidWithHistory({
      orderCode,
      changedByType,
      changedById,
      note: historyNote,
    });

    if (r.changed) {
      const scope = await this.orderRepo.getRealtimeScopeByOrderCode(orderCode);
      const scopedSession =
        scope?.sessionId && this.sessionRepo
          ? await this.sessionRepo.findById(scope.sessionId)
          : null;
      const at = new Date().toISOString();
      const realtimeScope = scope
        ? {
            orderId: scope.orderId,
            sessionId: scope.sessionId,
            sessionKey: scopedSession?.sessionKey ?? null,
            tableId: scope.tableId,
            branchId: scope.branchId,
          }
        : null;

      const paymentSuccessEvent = {
        type: "payment.success",
        at,
        payload: { orderCode, txnRef, provider, fromStatus: r.fromStatus, toStatus: r.toStatus },
      };

      await this.eventBus.publish(
        realtimeScope
          ? {
              ...paymentSuccessEvent,
              scope: realtimeScope,
            }
          : paymentSuccessEvent,
      );

      const orderStatusChangedEvent = {
        type: "order.status.changed",
        at,
        payload: {
          orderCode,
          fromStatus: r.fromStatus,
          toStatus: r.toStatus,
          changedBy: { type: changedByType, id: changedById },
          note: historyNote,
        },
      };

      await this.eventBus.publish(
        realtimeScope
          ? {
              ...orderStatusChangedEvent,
              scope: realtimeScope,
            }
          : orderStatusChangedEvent,
      );

      if (scope?.sessionId && this.sessionRepo && this.closeTableSession) {
        try {
          const session = scopedSession ?? (await this.sessionRepo.findById(scope.sessionId));
          if (session?.status === "OPEN") {
            await this.closeTableSession.execute(session.sessionKey);
          }
        } catch {
          // Payment success must stay committed even if post-payment session cleanup fails.
        }
      }
    }

    return {
      orderCode,
      changed: r.changed,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
    };
  }
}
