import { pool } from "../connection.js";

export class MySQLMenuItemStockRepository {
  async getQuantity(branchId: string, itemId: string): Promise<number> {
    const [rows]: any = await pool.query(
      `SELECT quantity FROM menu_item_stock WHERE branch_id = ? AND item_id = ? LIMIT 1`,
      [branchId, itemId],
    );
    const q = rows?.[0]?.quantity;
    return typeof q === "number" ? q : Number(q ?? 0);
  }

  /**
   * Atomic decrement with guard (quantity >= qty). Returns true if updated.
   */
  async decrementIfEnough(conn: any, branchId: string, itemId: string, qty: number): Promise<boolean> {
    const [res]: any = await conn.query(
      `UPDATE menu_item_stock
       SET quantity = quantity - ?
       WHERE branch_id = ? AND item_id = ? AND quantity >= ?`,
      [qty, branchId, itemId, qty],
    );
    return Number(res?.affectedRows ?? 0) === 1;
  }

  async ensureStockRow(branchId: string, itemId: string): Promise<void> {
    // Defensive upsert (seed should have created rows already)
    await pool.query(
      `INSERT INTO menu_item_stock (branch_id, item_id, quantity)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE quantity = quantity`,
      [branchId, itemId],
    );
  }
}
