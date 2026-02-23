import type { IMenuItemRepository } from "../../../../application/ports/repositories/IMenuItemRepository.js";
import { pool } from "../connection.js";

export class MySQLMenuItemRepository implements IMenuItemRepository {
  async getUnitPrice(itemId: string): Promise<number | null> {
    const [rows]: any = await pool.query(
      `SELECT price FROM menu_items WHERE item_id = ? AND is_active = 1 LIMIT 1`,
      [itemId]
    );
    const r = rows?.[0];
    if (!r) return null;
    return Number(r.price);
  }
}
