import type { IAdminOrderRepository } from "../../ports/repositories/IAdminOrderRepository.js";
import type { IEventBus } from "../../ports/events/IEventBus.js";
import type { OrderStatus } from "../../../domain/entities/Order.js";

type ActorInput = {
  actorType: "ADMIN" | "STAFF";
  userId: string;
  role: string;
  branchId: string | null;
};

type Actor = ActorInput;

function assertAllowed(actor: Actor, toStatus: OrderStatus) {
  // Spec rules (7 roles - demo):
  // - No one can directly set PAID via this endpoint
  // - ADMIN can change any non-PAID status
  // - BRANCH_MANAGER can change any non-PAID status
  // - KITCHEN can change to RECEIVED / PREPARING / READY
  // - STAFF / CASHIER cannot change status

  if (toStatus === "PAID") throw new Error("FORBIDDEN");

  if (actor.actorType === "ADMIN") return;

  const role = actor.role;
  if (role === "BRANCH_MANAGER") return;

  if (role === "KITCHEN") {
    if (toStatus === "RECEIVED" || toStatus === "PREPARING" || toStatus === "READY") {
      return;
    }
    throw new Error("FORBIDDEN");
  }

  throw new Error("FORBIDDEN");
}

function assertValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus) {
  if (fromStatus === toStatus) return;

  if (fromStatus === "CANCELED" || fromStatus === "COMPLETED" || fromStatus === "PAID") {
    throw new Error("INVALID_TRANSITION");
  }

  const allowed: Record<OrderStatus, OrderStatus[]> = {
    NEW: ["RECEIVED", "CANCELED"],
    RECEIVED: ["PREPARING", "CANCELED"],
    PREPARING: ["READY", "CANCELED"],
    READY: ["SERVING", "COMPLETED", "CANCELED"],
    SERVING: ["COMPLETED", "CANCELED"],
    DELIVERING: ["COMPLETED", "CANCELED"],
    COMPLETED: [],
    CANCELED: [],
    PAID: [],
  };

  const next = allowed[fromStatus] ?? [];
  if (!next.includes(toStatus)) throw new Error("INVALID_TRANSITION");
}

export class ChangeOrderStatus {
  constructor(
    private readonly repo: IAdminOrderRepository,
    private readonly eventBus: IEventBus,
    private readonly syncHooks: {
      syncMenuProjection?: ((input: { branchId: string; itemIds: string[] }) => Promise<unknown>) | null;
    } = {},
  ) {}

  async execute(input: {
    orderCode: string;
    toStatus: OrderStatus;
    note: string | null;
    actor: ActorInput;
  }) {
    let scope: any = null;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      scope = await this.repo.getRealtimeScopeByOrderCodeForBranch(input.orderCode, input.actor.branchId);
      if (!scope) throw new Error("FORBIDDEN");
    } else {
      scope = await this.repo.getRealtimeScopeByOrderCode(input.orderCode);
      if (!scope) throw new Error("ORDER_NOT_FOUND");
    }

    assertAllowed(input.actor, input.toStatus);

    const current =
      input.actor.actorType === "STAFF"
        ? await this.repo.getStatusByOrderCodeForBranch(input.orderCode, String(input.actor.branchId))
        : await this.repo.getStatusByOrderCode(input.orderCode);

    if (!current) throw new Error(input.actor.actorType === "STAFF" ? "FORBIDDEN" : "ORDER_NOT_FOUND");

    if (current === input.toStatus) {
      return { changed: false, fromStatus: current, toStatus: input.toStatus };
    }

    assertValidTransition(current, input.toStatus);

    const changedByType: "ADMIN" | "STAFF" =
      input.actor.actorType === "STAFF" ? "STAFF" : "ADMIN";

    if (input.toStatus === "PREPARING") {
      if (!scope?.branchId) throw new Error("FORBIDDEN");
      const branchId = String(scope.branchId);

      const preparingResult = await this.repo.transitionToPreparingWithInventoryConsumption({
        orderCode: input.orderCode,
        branchId,
        changedById: input.actor.userId,
        note: input.note,
      });

      if (
        preparingResult.inventoryChanged &&
        preparingResult.affectedMenuItemIds.length > 0 &&
        this.syncHooks.syncMenuProjection
      ) {
        await Promise.allSettled([
          this.syncHooks.syncMenuProjection({
            branchId,
            itemIds: preparingResult.affectedMenuItemIds,
          }),
        ]);
      }

      await this.repo.insertStatusHistory({
        orderCode: input.orderCode,
        fromStatus: current,
        toStatus: input.toStatus,
        changedByType,
        changedById: input.actor.userId,
        note: input.note,
      });

      if (preparingResult.inventoryChanged) {
        await this.eventBus.publish({
          type: "inventory.updated",
          at: new Date().toISOString(),
          scope: {
            orderId: scope.orderId,
            sessionId: scope.sessionId,
            tableId: scope.tableId,
            branchId: scope.branchId,
          },
          payload: {
            orderCode: input.orderCode,
            fromStatus: current,
            toStatus: input.toStatus,
            consumedLines: preparingResult.consumedLines,
            affectedMenuItemIds: preparingResult.affectedMenuItemIds,
            source: "order.prepare.consume.legacy",
            triggerStatus: preparingResult.inventoryTriggerStatus,
          },
        });
      }

      await this.eventBus.publish({
        type: "order.status_changed",
        at: new Date().toISOString(),
        scope: {
          orderId: scope.orderId,
          sessionId: scope.sessionId,
          tableId: scope.tableId,
          branchId: scope.branchId,
        },
        payload: {
          orderCode: input.orderCode,
          fromStatus: current,
          toStatus: input.toStatus,
          changedByType,
          changedById: input.actor.userId,
          note: input.note,
        },
      });

      return { changed: true, fromStatus: current, toStatus: input.toStatus };
    }

    if (input.toStatus === "CANCELED") {
      if (!scope?.branchId) throw new Error("FORBIDDEN");

      const cancelResult = await this.repo.cancelWithInventoryRestockIfApplicable({
        orderCode: input.orderCode,
        branchId: String(scope.branchId),
        changedByType,
        changedById: input.actor.userId,
        note: input.note,
      });

      if (
        cancelResult.inventoryChanged &&
        cancelResult.affectedMenuItemIds.length > 0 &&
        this.syncHooks.syncMenuProjection
      ) {
        await Promise.allSettled([
          this.syncHooks.syncMenuProjection({
            branchId: String(scope.branchId),
            itemIds: cancelResult.affectedMenuItemIds,
          }),
        ]);
      }

      await this.repo.insertStatusHistory({
        orderCode: input.orderCode,
        fromStatus: current,
        toStatus: input.toStatus,
        changedByType,
        changedById: input.actor.userId,
        note: input.note,
      });

      if (cancelResult.inventoryChanged) {
        await this.eventBus.publish({
          type: "inventory.updated",
          at: new Date().toISOString(),
          scope: {
            orderId: scope.orderId,
            sessionId: scope.sessionId,
            tableId: scope.tableId,
            branchId: scope.branchId,
          },
          payload: {
            orderCode: input.orderCode,
            fromStatus: current,
            toStatus: input.toStatus,
            restoredLines: cancelResult.restoredLines,
            affectedMenuItemIds: cancelResult.affectedMenuItemIds,
            source: "order.cancel.restock",
            triggerStatus: cancelResult.inventoryTriggerStatus,
          },
        });
      }

      await this.eventBus.publish({
        type: "order.status_changed",
        at: new Date().toISOString(),
        scope: {
          orderId: scope.orderId,
          sessionId: scope.sessionId,
          tableId: scope.tableId,
          branchId: scope.branchId,
        },
        payload: {
          orderCode: input.orderCode,
          fromStatus: current,
          toStatus: input.toStatus,
          changedByType,
          changedById: input.actor.userId,
          note: input.note,
        },
      });

      return { changed: true, fromStatus: current, toStatus: input.toStatus };
    }

    const setTimeFields = {
      acceptedAt: input.toStatus === "RECEIVED",
      preparedAt: false,
      completedAt: input.toStatus === "COMPLETED",
      canceledAt: false,
    };

    if (input.actor.actorType === "STAFF") {
      await this.repo.updateStatusByOrderCodeForBranch({
        orderCode: input.orderCode,
        branchId: String(input.actor.branchId),
        toStatus: input.toStatus,
        setTimeFields,
      });
    } else {
      await this.repo.updateStatusByOrderCode({
        orderCode: input.orderCode,
        toStatus: input.toStatus,
        setTimeFields,
      });
    }

    await this.repo.insertStatusHistory({
      orderCode: input.orderCode,
      fromStatus: current,
      toStatus: input.toStatus,
      changedByType,
      changedById: input.actor.userId,
      note: input.note,
    });

    await this.eventBus.publish({
      type: "order.status_changed",
      at: new Date().toISOString(),
      scope: {
        orderId: scope.orderId,
        sessionId: scope.sessionId,
        tableId: scope.tableId,
        branchId: scope.branchId,
      },
      payload: {
        orderCode: input.orderCode,
        fromStatus: current,
        toStatus: input.toStatus,
        changedByType,
        changedById: input.actor.userId,
        note: input.note,
      },
    });

    return { changed: true, fromStatus: current, toStatus: input.toStatus };
  }
}
