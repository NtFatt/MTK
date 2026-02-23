import type { OrderStatus } from "../../../domain/entities/Order.js";

export type OrderRealtimeScope = {
  orderId: string;
  sessionId: string | null;
  tableId: string | null;
  branchId: string | null;
};

export interface IAdminOrderRepository {
  getStatusByOrderCode(orderCode: string): Promise<OrderStatus | null>;

  /** Branch-scoped helper (staff-side). Returns null if orderCode is not in branch (or does not exist). */
  getStatusByOrderCodeForBranch(orderCode: string, branchId: string): Promise<OrderStatus | null>;

  getRealtimeScopeByOrderCode(orderCode: string): Promise<OrderRealtimeScope | null>;

  /** Branch-scoped helper (staff-side). Returns null if orderCode is not in branch (or does not exist). */
  getRealtimeScopeByOrderCodeForBranch(orderCode: string, branchId: string): Promise<OrderRealtimeScope | null>;

  updateStatusByOrderCode(input: {
    orderCode: string;
    toStatus: OrderStatus;
    setTimeFields: Partial<{
      acceptedAt: boolean;
      preparedAt: boolean;
      completedAt: boolean;
      canceledAt: boolean;
    }>;
  }): Promise<void>;

  /** Branch-scoped update (staff-side). */
  updateStatusByOrderCodeForBranch(input: {
    orderCode: string;
    branchId: string;
    toStatus: OrderStatus;
    setTimeFields: Partial<{
      acceptedAt: boolean;
      preparedAt: boolean;
      completedAt: boolean;
      canceledAt: boolean;
    }>;
  }): Promise<void>;

  insertStatusHistory(input: {
    orderCode: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    changedByType: "ADMIN" | "CLIENT" | "SYSTEM";
    changedById: string | null;
    note: string | null;
  }): Promise<void>;
}
