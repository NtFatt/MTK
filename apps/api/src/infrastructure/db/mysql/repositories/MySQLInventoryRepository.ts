import type {
  AdjustBranchStockInput,
  AdjustBranchStockOutput,
  BranchStockRow,
  IInventoryRepository,
} from "../../../application/ports/repositories/IInventoryRepository.js";
import { pool } from "../connection.js";

function toIntQty(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export class MySQLInventoryRepository implements IInventoryRepository {
  async listBranchStock(branchId: string): Promise<BranchStockRow[]> {
    const b = String(branchId);

    const [rows]: any = await pool.query(
      `SELECT
         s.branch_id as branchId,
         s.item_id as itemId,
         mi.item_name as itemName,
         mi.category_id as categoryId,
         mc.category_name as categoryName,
         s.quantity as quantity,
         s.last_restock_at as lastRestockAt,
         s.updated_at as updatedAt
       FROM menu_item_stock s
       JOIN menu_items mi ON mi.item_id = s.item_id
       LEFT JOIN menu_categories mc ON mc.category_id = mi.category_id
       WHERE s.branch_id = ?
       ORDER BY mi.category_id ASC, mi.sort_order ASC, mi.item_id ASC`,
      [b],
    );

    return (rows ?? []).map((r: any) => ({
      branchId: String(r.branchId),
      itemId: String(r.itemId),
      itemName: String(r.itemName ?? ""),
      categoryId: String(r.categoryId),
      categoryName: r.categoryName === null || r.categoryName === undefined ? null : String(r.categoryName),
      quantity: toIntQty(r.quantity),
      lastRestockAt: r.lastRestockAt ? new Date(r.lastRestockAt).toISOString() : null,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    }));
  }

  async adjustBranchStock(input: AdjustBranchStockInput): Promise<AdjustBranchStockOutput> {
    const branchId = String(input.branchId);
    const itemId = String(input.itemId);
    const mode = input.mode;
    const qty = toIntQty(input.quantity);

    if (!branchId) throw new Error("BRANCH_REQUIRED");
    if (!itemId) throw new Error("ITEM_NOT_FOUND");

    const conn: any = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Defensive upsert to ensure row exists.
      await conn.query(
        `INSERT INTO menu_item_stock (branch_id, item_id, quantity)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE quantity = quantity`,
        [branchId, itemId],
      );

      const [curRows]: any = await conn.query(
        `SELECT quantity FROM menu_item_stock WHERE branch_id = ? AND item_id = ? FOR UPDATE`,
        [branchId, itemId],
      );

      const prevQty = toIntQty(curRows?.[0]?.quantity);
      let newQty = prevQty;

      if (mode === "RESTOCK") {
        newQty = prevQty + qty;
      } else if (mode === "DEDUCT") {
        if (qty > prevQty) throw new Error("OUT_OF_STOCK");
        newQty = prevQty - qty;
      } else if (mode === "SET") {
        newQty = qty;
      } else {
        throw new Error("INVALID_MODE");
      }

      await conn.query(
        `UPDATE menu_item_stock
         SET quantity = ?,
             last_restock_at = CASE WHEN ? IN ('RESTOCK','SET') THEN NOW() ELSE last_restock_at END
         WHERE branch_id = ? AND item_id = ?`,
        [newQty, mode, branchId, itemId],
      );

      // Legacy/UI mirror: menu_items.stock_qty (kept for menu list).
      await conn.query(
        `UPDATE menu_items SET stock_qty = ? WHERE item_id = ?`,
        [newQty, itemId],
      );

      await conn.commit();
      return { branchId, itemId, prevQty, newQty, mode };
    } catch (e) {
      try {
        await conn.rollback();
      } catch {
        // ignore
      }
      throw e;
    } finally {
      try {
        conn.release();
      } catch {
        // ignore
      }
    }
  }
}
