import type { IMenuItemRepository } from "../../../../application/ports/repositories/IMenuItemRepository.js";
import { MenuItem } from "../../../../domain/entities/MenuItem.js";
import { pool } from "../connection.js";

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapRowToMenuItem(row: any): MenuItem {
  return new MenuItem(
    String(row.item_id),
    String(row.category_id),
    String(row.item_name),
    safeNumber(row.price),
    row.description === null ? null : String(row.description ?? ""),
    row.image_url === null ? null : String(row.image_url ?? ""),
    toBool(row.is_active),
    row.stock_qty === null || row.stock_qty === undefined ? null : Number(row.stock_qty),
    row.category_name === null || row.category_name === undefined
      ? null
      : String(row.category_name),
    toBool(row.is_combo),
    toBool(row.is_meat),
  );
}

export class MySQLMenuItemRepository implements IMenuItemRepository {
  async getUnitPrice(itemId: string): Promise<number | null> {
    const [rows]: any = await pool.query(
      `SELECT price FROM menu_items WHERE item_id = ? AND is_active = 1 LIMIT 1`,
      [itemId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return Number(r.price);
  }

  async existsCategory(categoryId: string): Promise<boolean> {
    const [rows]: any = await pool.query(
      `SELECT 1
       FROM menu_categories
       WHERE category_id = ?
       LIMIT 1`,
      [categoryId],
    );

    return Boolean(rows?.[0]);
  }

  async findById(itemId: string): Promise<MenuItem | null> {
    const [rows]: any = await pool.query(
      `SELECT
        mi.item_id,
        mi.category_id,
        c.category_name,
        mi.item_name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.is_active,
        mi.stock_qty,
        (cs.combo_id IS NOT NULL) AS is_combo,
        (mp.item_id IS NOT NULL) AS is_meat
       FROM menu_items mi
       JOIN menu_categories c ON c.category_id = mi.category_id
       LEFT JOIN combo_sets cs ON cs.combo_item_id = mi.item_id
       LEFT JOIN meat_profiles mp ON mp.item_id = mi.item_id
       WHERE mi.item_id = ?
       LIMIT 1`,
      [itemId],
    );

    const row = rows?.[0];
    return row ? mapRowToMenuItem(row) : null;
  }

  async createMenuItem(input: {
    categoryId: string;
    name: string;
    price: number;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
  }): Promise<MenuItem> {
    const [result]: any = await pool.query(
      `INSERT INTO menu_items (
        category_id,
        item_name,
        description,
        price,
        image_url,
        is_active,
        stock_qty
      ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        input.categoryId,
        input.name,
        input.description ?? null,
        input.price,
        input.imageUrl ?? null,
        input.isActive ? 1 : 0,
      ],
    );

    const itemId = String(result?.insertId ?? "");
    if (!itemId) {
      throw new Error("MENU_ITEM_CREATE_FAILED");
    }

    const created = await this.findById(itemId);
    if (!created) {
      throw new Error("MENU_ITEM_CREATE_FAILED");
    }

    return created;
  }

  async updateMenuItem(input: {
    itemId: string;
    categoryId?: string;
    name?: string;
    price?: number;
    description?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
  }): Promise<MenuItem | null> {
    const sets: string[] = [];
    const params: any[] = [];

    if (input.categoryId !== undefined) {
      sets.push("category_id = ?");
      params.push(input.categoryId);
    }
    if (input.name !== undefined) {
      sets.push("item_name = ?");
      params.push(input.name);
    }
    if (input.price !== undefined) {
      sets.push("price = ?");
      params.push(input.price);
    }
    if (input.description !== undefined) {
      sets.push("description = ?");
      params.push(input.description ?? null);
    }
    if (input.imageUrl !== undefined) {
      sets.push("image_url = ?");
      params.push(input.imageUrl ?? null);
    }
    if (input.isActive !== undefined) {
      sets.push("is_active = ?");
      params.push(input.isActive ? 1 : 0);
    }

    if (!sets.length) {
      return this.findById(input.itemId);
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(input.itemId);

    const [result]: any = await pool.query(
      `UPDATE menu_items
       SET ${sets.join(", ")}
       WHERE item_id = ?
       LIMIT 1`,
      params,
    );

    if (!result?.affectedRows) {
      return null;
    }

    return this.findById(input.itemId);
  }

  async setMenuItemActive(input: {
    itemId: string;
    isActive: boolean;
  }): Promise<MenuItem | null> {
    const [result]: any = await pool.query(
      `UPDATE menu_items
       SET is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE item_id = ?
       LIMIT 1`,
      [input.isActive ? 1 : 0, input.itemId],
    );

    if (!result?.affectedRows) {
      return null;
    }

    return this.findById(input.itemId);
  }
}