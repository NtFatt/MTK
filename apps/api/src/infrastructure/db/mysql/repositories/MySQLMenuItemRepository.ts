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
        0 AS is_combo,
        0 AS is_meat
       FROM menu_items mi
       JOIN menu_categories c ON c.category_id = mi.category_id
       WHERE mi.item_id = ?
       LIMIT 1`,
      [itemId],
    );

    const r = rows?.[0];
    if (!r) {
      throw new Error("MENU_ITEM_CREATE_FAILED");
    }

    return new MenuItem(
      String(r.item_id),
      String(r.category_id),
      String(r.item_name),
      safeNumber(r.price),
      r.description === null ? null : String(r.description ?? ""),
      r.image_url === null ? null : String(r.image_url ?? ""),
      toBool(r.is_active),
      r.stock_qty === null || r.stock_qty === undefined ? null : Number(r.stock_qty),
      String(r.category_name),
      toBool(r.is_combo),
      toBool(r.is_meat),
    );
  }
}