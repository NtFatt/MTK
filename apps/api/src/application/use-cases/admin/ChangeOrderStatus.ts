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

/**
 * Xác thực quyền thay đổi trạng thái dựa trên Role nội bộ.
 */
function assertAllowed(actor: Actor, toStatus: OrderStatus) {
  // Spec rules (7 roles - demo):
  // - No one can directly set PAID via this endpoint
  // - ADMIN can change any non-PAID status
  // - BRANCH_MANAGER can change any non-PAID status
  // - KITCHEN can change to RECEIVED / READY
  // - STAFF / CASHIER cannot change status

  if (toStatus === "PAID") throw new Error("FORBIDDEN");

  if (actor.actorType === "ADMIN") return; // ADMIN has broad authority

  const role = actor.role;
  if (role === "BRANCH_MANAGER") return;

  if (role === "KITCHEN") {
    if (toStatus === "RECEIVED" || toStatus === "READY") return;
    throw new Error("FORBIDDEN");
  }

  throw new Error("FORBIDDEN");
}

function assertValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus) {
  if (fromStatus === toStatus) return;

  // Terminal states: cannot move out.
  if (fromStatus === "CANCELED" || fromStatus === "COMPLETED" || fromStatus === "PAID") {
    throw new Error("INVALID_TRANSITION");
  }

  const allowed: Record<OrderStatus, OrderStatus[]> = {
    NEW: ["RECEIVED", "PREPARING", "CANCELED"],
    RECEIVED: ["PREPARING", "READY", "CANCELED"],
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
  ) {}

  async execute(input: {
    orderCode: string;
    toStatus: OrderStatus;
    note: string | null;
    actor: ActorInput;
  }) {
    // 1. Kiểm tra phạm vi chi nhánh (Branch Scoping)
    // Rule (anti-leak): STAFF-side endpoints must NOT reveal whether an orderCode exists in another branch.
    // => With STAFF tokens, we scope the lookup by branchId; if not found, we respond FORBIDDEN.
    let scope = null as any;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      scope = await this.repo.getRealtimeScopeByOrderCodeForBranch(input.orderCode, input.actor.branchId);
      if (!scope) throw new Error("FORBIDDEN");
    } else {
      scope = await this.repo.getRealtimeScopeByOrderCode(input.orderCode);
      if (!scope) throw new Error("ORDER_NOT_FOUND");
    }

    // 2. Xác thực quyền Logic
    assertAllowed(input.actor, input.toStatus);

    const current = input.actor.actorType === "STAFF"
      ? await this.repo.getStatusByOrderCodeForBranch(input.orderCode, String(input.actor.branchId))
      : await this.repo.getStatusByOrderCode(input.orderCode);

    if (!current) throw new Error(input.actor.actorType === "STAFF" ? "FORBIDDEN" : "ORDER_NOT_FOUND");

    if (current === input.toStatus) {
      return { changed: false, fromStatus: current, toStatus: input.toStatus };
    }

    // 2.5 Validate state machine transition (NEG-04)
    assertValidTransition(current, input.toStatus);

    // 3. Cập nhật trạng thái và lưu lịch sử [cite: 157]
    const setTimeFields = {
      acceptedAt: input.toStatus === "RECEIVED",
      preparedAt: input.toStatus === "READY",
      completedAt: input.toStatus === "COMPLETED",
      canceledAt: input.toStatus === "CANCELED",
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

    // Ép kiểu changedByType về ADMIN để khớp với Schema MySQL hiện tại [cite: 89]
    const changedByType: "ADMIN" = "ADMIN";

    await this.repo.insertStatusHistory({
      orderCode: input.orderCode,
      fromStatus: current,
      toStatus: input.toStatus,
      changedByType,
      changedById: input.actor.userId,
      note: input.note,
    });

    // 4. Phát sự kiện Realtime [cite: 30, 147]
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
