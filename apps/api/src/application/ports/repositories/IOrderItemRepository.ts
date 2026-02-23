import { OrderItem } from "../../../domain/entities/OrderItem.js";

export interface IOrderItemRepository {
  bulkInsert(orderId: string, items: OrderItem[]): Promise<void>;
}
