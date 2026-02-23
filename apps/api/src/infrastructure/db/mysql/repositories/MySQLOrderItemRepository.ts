import type { IOrderItemRepository } from "../../../../application/ports/repositories/IOrderItemRepository.js";
import { OrderItem } from "../../../../domain/entities/OrderItem.js";
import { pool } from "../connection.js";

export class MySQLOrderItemRepository implements IOrderItemRepository {
  async bulkInsert(orderId: string, items: OrderItem[]): Promise<void> {
    // Safe implementation for smoke stability (can batch-optimize later)
    for (const it of items) {
      let itemName = (it as any).itemName;
      if (!itemName) {
        const [rows]: any = await pool.query(
          `SELECT item_name FROM menu_items WHERE item_id = ? LIMIT 1`,
          [(it as any).itemId]
        );
        itemName = rows?.[0]?.item_name;
        if (!itemName) throw new Error("ITEM_NOT_FOUND");
      }

      const unitPrice = Number((it as any).unitPrice);
      const quantity = Number((it as any).quantity);
      const lineTotal = unitPrice * quantity;
      const itemOptions = (it as any).itemOptions ?? null;
      const itemOptionsJson = itemOptions == null ? null : JSON.stringify(itemOptions);

      await pool.query(
        `INSERT INTO order_items
          (order_id, item_id, item_name, unit_price, quantity, line_total, item_options)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, (it as any).itemId, itemName, unitPrice, quantity, lineTotal, itemOptionsJson]
      );
    }
  }
}
