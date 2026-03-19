import type {
  IMenuRecipeRepository,
  MenuRecipeLine,
  SaveMenuRecipeLineInput,
} from "../../../../application/ports/repositories/IMenuRecipeRepository.js";
import { pool } from "../connection.js";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export class MySQLMenuRecipeRepository implements IMenuRecipeRepository {
  async getByMenuItemId(menuItemId: string, branchId: string): Promise<MenuRecipeLine[]> {
    const [rows]: any = await pool.query(
      `SELECT
         r.ingredient_id,
         i.ingredient_name,
         r.qty_per_item,
         r.unit
       FROM menu_item_recipes r
       JOIN inventory_items i
         ON i.id = r.ingredient_id
        AND i.branch_id = ?
       WHERE r.menu_item_id = ?
       ORDER BY i.ingredient_name ASC`,
      [branchId, menuItemId],
    );

    return (rows ?? []).map((r: any) => ({
      ingredientId: String(r.ingredient_id),
      ingredientName: String(r.ingredient_name),
      qtyPerItem: toNum(r.qty_per_item),
      unit: String(r.unit),
    }));
  }

  async saveByMenuItemId(input: {
    menuItemId: string;
    branchId: string;
    lines: SaveMenuRecipeLineInput[];
  }): Promise<MenuRecipeLine[]> {
    const conn: any = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const ingredientIds = [...new Set(input.lines.map((x) => String(x.ingredientId)))];

      if (ingredientIds.length > 0) {
        const placeholders = ingredientIds.map(() => "?").join(",");
        const [validRows]: any = await conn.query(
          `
          SELECT id
          FROM inventory_items
          WHERE branch_id = ?
            AND id IN (${placeholders})
          `,
          [input.branchId, ...ingredientIds],
        );

        const validIds = new Set((validRows ?? []).map((r: any) => String(r.id)));

        for (const ingredientId of ingredientIds) {
          if (!validIds.has(ingredientId)) {
            throw new Error("RECIPE_INGREDIENT_NOT_FOUND");
          }
        }
      }

      await conn.query(
        `DELETE FROM menu_item_recipes WHERE menu_item_id = ?`,
        [input.menuItemId],
      );

      for (const line of input.lines) {
        await conn.query(
          `INSERT INTO menu_item_recipes (menu_item_id, ingredient_id, qty_per_item, unit)
           VALUES (?, ?, ?, ?)`,
          [input.menuItemId, line.ingredientId, line.qtyPerItem, line.unit],
        );
      }

      await conn.commit();
      return this.getByMenuItemId(input.menuItemId, input.branchId);
    } catch (e: any) {
      await conn.rollback();

      if (e?.code === "ER_DUP_ENTRY") {
        throw new Error("DUPLICATE_RECIPE_INGREDIENT");
      }

      throw e;
    } finally {
      conn.release();
    }
  }

  async listMenuItemIdsByIngredient(branchId: string, ingredientId: string): Promise<string[]> {
    const [rows]: any = await pool.query(
      `SELECT DISTINCT r.menu_item_id
       FROM menu_item_recipes r
       JOIN inventory_items i
         ON i.id = r.ingredient_id
        AND i.branch_id = ?
       WHERE r.ingredient_id = ?
       ORDER BY r.menu_item_id ASC`,
      [branchId, ingredientId],
    );

    return (rows ?? []).map((r: any) => String(r.menu_item_id));
  }

  async recomputeAndSyncMenuItemStock(branchId: string, menuItemId: string): Promise<number> {
    const conn: any = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT
           COALESCE(MIN(FLOOR(i.current_qty / r.qty_per_item)), 0) AS sellable_qty
         FROM menu_item_recipes r
         JOIN inventory_items i
           ON i.id = r.ingredient_id
          AND i.branch_id = ?
         WHERE r.menu_item_id = ?`,
        [branchId, menuItemId],
      );

      const sellableQty = Math.max(0, toNum(rows?.[0]?.sellable_qty));

      await conn.query(
        `INSERT INTO menu_item_stock (branch_id, item_id, quantity, last_restock_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           quantity = VALUES(quantity),
           updated_at = VALUES(updated_at)`,
        [branchId, menuItemId, sellableQty],
      );

      await conn.query(
        `UPDATE menu_items
         SET stock_qty = ?, updated_at = NOW()
         WHERE item_id = ?`,
        [sellableQty, menuItemId],
      );

      await conn.commit();
      return sellableQty;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}