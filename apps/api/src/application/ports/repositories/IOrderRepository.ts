import type { OrderChannel, OrderStatus } from "../../../domain/entities/Order.js";

// Keep in sync with DB constraint ck_osh_actor in scripts/full_schema.sql
export type OrderStatusHistoryActor = "ADMIN" | "CLIENT" | "SYSTEM" | "STAFF";

export type OrderRealtimeScope = {
  orderId: string;
  sessionId: string | null;
  tableId: string | null;
  branchId: string | null;
};

export interface IOrderRepository {
  create(input: {
    orderCode: string;
    clientId: string | null;
    sessionId: string | null;
    deliveryAddressId: string | null;
    orderChannel: OrderChannel;
    discountPercentApplied: number;
    deliveryFee: number;
    note: string | null;
  }): Promise<{ orderId: string }>;

  findStatusByOrderCode(orderCode: string): Promise<{
    orderCode: string;
    orderStatus: OrderStatus;
    updatedAt: string;
  } | null>;


  /**
   * Branch-scoped helper (staff-side):
   * returns null if orderCode is not in the given branch (or does not exist).
   */
  findStatusByOrderCodeForBranch(orderCode: string, branchId: string): Promise<{
    orderCode: string;
    orderStatus: OrderStatus;
    updatedAt: string;
  } | null>;

  /**
   * Branch-scoped helper (staff-side):
   * returns null if orderCode is not in the given branch (or does not exist).
   */
  getRealtimeScopeByOrderCodeForBranch(orderCode: string, branchId: string): Promise<OrderRealtimeScope | null>;

  getRealtimeScopeByOrderCode(orderCode: string): Promise<OrderRealtimeScope | null>;

  getRealtimeScopeByOrderId(orderId: string): Promise<OrderRealtimeScope | null>;

  /** Legacy helper (kept for compatibility). Prefer markPaidWithHistory(). */
  setPaidByOrderCode(orderCode: string): Promise<void>;

  /**
   * Transactional + idempotent: lock order row, only move to PAID once,
   * and write to order_status_history when a real transition happens.
   */
  markPaidWithHistory(input: {
    orderCode: string;
    changedByType: OrderStatusHistoryActor;
    changedById: string | null;
    note: string | null;
  }): Promise<{ changed: boolean; fromStatus: OrderStatus; toStatus: OrderStatus }>;
}
