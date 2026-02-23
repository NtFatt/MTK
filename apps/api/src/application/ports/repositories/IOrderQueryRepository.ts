import type { OrderStatus } from "../../../domain/entities/Order.js";

export type OrderListRow = {
  orderCode: string;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
  branchId: string | null;
  tableCode: string | null;
};

export interface IOrderQueryRepository {
  /**
   * Kitchen queue (operational view).
   */
  listKitchenQueue(input: {
    branchId?: string | null;
    statuses: OrderStatus[];
    limit: number;
  }): Promise<OrderListRow[]>;

  /**
   * Cashier view: orders not paid yet.
   */
  listUnpaidOrders(input: {
    branchId?: string | null;
    limit: number;
  }): Promise<OrderListRow[]>;
}
