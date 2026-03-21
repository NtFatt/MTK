import type { OrderStatus } from "../../../domain/entities/Order.js";

export type KitchenQueueIngredientRow = {
  ingredientId: string;
  ingredientName: string;
  qtyPerItem: number;
  unit: string;
};

export type OrderListItemRow = {
  orderItemId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  itemOptions: any | null;
  recipe?: KitchenQueueIngredientRow[];
  recipeConfigured?: boolean;
  unitPrice?: number;
  lineTotal?: number;
  pricingBreakdown?: any | null;
};

export type KitchenQueueItemRow = OrderListItemRow;

export type OrderListRow = {
  orderId?: string;
  orderCode: string;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
  branchId: string | null;
  tableCode: string | null;
  sessionOpenedAt?: string | null;
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  voucherCode?: string | null;
  voucherName?: string | null;
  orderNote?: string | null;
  items?: KitchenQueueItemRow[];
  totalItemCount?: number;
  uniqueItemCount?: number;
  recipeConfigured?: boolean;
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
