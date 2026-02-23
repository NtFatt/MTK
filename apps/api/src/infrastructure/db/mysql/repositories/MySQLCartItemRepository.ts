import type { ICartItemRepository } from "../../../../application/ports/repositories/ICartItemRepository.js";
import { CartItem } from "../../../../domain/entities/CartItem.js";
import { pool } from "../connection.js";

function normalizeJson(value: any): any {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export class MySQLCartItemRepository implements ICartItemRepository {
  async upsert(input: {
    cartId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    optionsHash: string;
    itemOptions?: any | null;
  }): Promise<void> {
    const itemOptionsJson = input.itemOptions == null ? null : JSON.stringify(input.itemOptions);

    await pool.query(
      `INSERT INTO cart_items (cart_id, item_id, quantity, unit_price, item_options, options_hash)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         quantity = VALUES(quantity),
         unit_price = VALUES(unit_price),
         item_options = VALUES(item_options)`,
      [input.cartId, input.itemId, input.quantity, input.unitPrice, itemOptionsJson, input.optionsHash]
    );
  }

  async remove(input: { cartId: string; itemId: string; optionsHash?: string | null }): Promise<void> {
    if (input.optionsHash !== undefined && input.optionsHash !== null) {
      await pool.query(
        `DELETE FROM cart_items WHERE cart_id = ? AND item_id = ? AND options_hash = ?`,
        [input.cartId, input.itemId, input.optionsHash]
      );
      return;
    }

    await pool.query(
      `DELETE FROM cart_items WHERE cart_id = ? AND item_id = ?`,
      [input.cartId, input.itemId]
    );
  }

  async listByCartId(cartId: string): Promise<CartItem[]> {
    const [rows]: any = await pool.query(
      `SELECT cart_id, item_id, quantity, unit_price, options_hash, item_options
       FROM cart_items
       WHERE cart_id = ?
       ORDER BY item_id ASC, options_hash ASC`,
      [cartId]
    );

    return (rows ?? []).map((r: any) => {
      const opts = normalizeJson(r.item_options);
      return new CartItem(
        String(r.cart_id),
        String(r.item_id),
        Number(r.quantity),
        Number(r.unit_price),
        String(r.options_hash ?? ""),
        opts
      );
    });
  }
}
