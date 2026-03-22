import type {
  AdminMenuCategorySummary,
  IMenuCategoryRepository,
} from "../../../../application/ports/repositories/IMenuCategoryRepository.js";
import { MenuCategory } from "../../../../domain/entities/MenuCategory.js";
import { pool } from "../connection.js";

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function mapRowToCategory(row: any): MenuCategory {
  return new MenuCategory(
    String(row.category_id),
    String(row.category_name),
    Number(row.sort_order ?? 0),
    toBool(row.is_active),
  );
}

export class MySQLMenuCategoryRepository implements IMenuCategoryRepository {
  async listAdminCategories(): Promise<AdminMenuCategorySummary[]> {
    const [rows]: any = await pool.query(
      `SELECT
         mc.category_id,
         mc.category_name,
         mc.sort_order,
         mc.is_active,
         COUNT(mi.item_id) AS item_count,
         SUM(CASE WHEN mi.is_active = 1 THEN 1 ELSE 0 END) AS active_item_count
       FROM menu_categories mc
       LEFT JOIN menu_items mi ON mi.category_id = mc.category_id
       GROUP BY mc.category_id, mc.category_name, mc.sort_order, mc.is_active
       ORDER BY mc.sort_order ASC, mc.category_id ASC`,
    );

    return (rows ?? []).map((row: any) => ({
      id: String(row.category_id),
      name: String(row.category_name),
      sortOrder: Number(row.sort_order ?? 0),
      isActive: toBool(row.is_active),
      itemCount: Number(row.item_count ?? 0),
      activeItemCount: Number(row.active_item_count ?? 0),
    }));
  }

  async findById(categoryId: string): Promise<MenuCategory | null> {
    const [rows]: any = await pool.query(
      `SELECT category_id, category_name, sort_order, is_active
       FROM menu_categories
       WHERE category_id = ?
       LIMIT 1`,
      [categoryId],
    );

    const row = rows?.[0];
    return row ? mapRowToCategory(row) : null;
  }

  async findByName(name: string, excludeCategoryId: string | null = null): Promise<MenuCategory | null> {
    const [rows]: any = await pool.query(
      `SELECT category_id, category_name, sort_order, is_active
       FROM menu_categories
       WHERE LOWER(category_name) = LOWER(?)
         AND (? IS NULL OR category_id <> ?)
       LIMIT 1`,
      [name, excludeCategoryId, excludeCategoryId],
    );

    const row = rows?.[0];
    return row ? mapRowToCategory(row) : null;
  }

  async countItems(categoryId: string): Promise<number> {
    const [rows]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM menu_items
       WHERE category_id = ?`,
      [categoryId],
    );

    return Number(rows?.[0]?.total ?? 0);
  }

  async createCategory(input: {
    name: string;
    sortOrder: number;
    isActive: boolean;
  }): Promise<MenuCategory> {
    const [result]: any = await pool.query(
      `INSERT INTO menu_categories (
         category_name,
         sort_order,
         is_active
       ) VALUES (?, ?, ?)`,
      [input.name, input.sortOrder, input.isActive ? 1 : 0],
    );

    const categoryId = String(result?.insertId ?? "");
    if (!categoryId) {
      throw new Error("MENU_CATEGORY_CREATE_FAILED");
    }

    const created = await this.findById(categoryId);
    if (!created) {
      throw new Error("MENU_CATEGORY_CREATE_FAILED");
    }

    return created;
  }

  async updateCategory(input: {
    categoryId: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<MenuCategory | null> {
    const sets: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      sets.push("category_name = ?");
      params.push(input.name);
    }
    if (input.sortOrder !== undefined) {
      sets.push("sort_order = ?");
      params.push(input.sortOrder);
    }
    if (input.isActive !== undefined) {
      sets.push("is_active = ?");
      params.push(input.isActive ? 1 : 0);
    }

    if (!sets.length) {
      return this.findById(input.categoryId);
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(input.categoryId);

    const [result]: any = await pool.query(
      `UPDATE menu_categories
       SET ${sets.join(", ")}
       WHERE category_id = ?
       LIMIT 1`,
      params,
    );

    if (!result?.affectedRows) {
      return null;
    }

    return this.findById(input.categoryId);
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const [result]: any = await pool.query(
      `DELETE FROM menu_categories
       WHERE category_id = ?
       LIMIT 1`,
      [categoryId],
    );

    return Boolean(result?.affectedRows);
  }
}
