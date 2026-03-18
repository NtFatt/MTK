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
}