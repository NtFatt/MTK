import type { ICartRepository } from "../../../../application/ports/repositories/ICartRepository.js";
import { Cart, type OrderChannel } from "../../../../domain/entities/Cart.js";
import { pool } from "../connection.js";

export class MySQLCartRepository implements ICartRepository {
  private mapRow(r: any): Cart {
    return new Cart(
      String(r.cart_id),
      String(r.cart_key),
      r.order_channel,
      r.cart_status,
      r.branch_id ? String(r.branch_id) : null,
      r.session_id ? String(r.session_id) : null,
      r.client_id ? String(r.client_id) : null,
    );
  }

  async findActiveBySessionId(sessionId: string): Promise<Cart | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM carts WHERE session_id = ? AND cart_status = 'ACTIVE' LIMIT 1`,
      [sessionId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return this.mapRow(r);
  }

  async createForSession(sessionId: string, channel: OrderChannel): Promise<Cart> {
    // Resolve branch_id from table_sessions -> restaurant_tables
    const [bRows]: any = await pool.query(
      `SELECT rt.branch_id
       FROM table_sessions ts
       JOIN restaurant_tables rt ON rt.table_id = ts.table_id
       WHERE ts.session_id = ?
       LIMIT 1`,
      [sessionId],
    );

    const branchId = bRows?.[0]?.branch_id;
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const [result]: any = await pool.query(
      `INSERT INTO carts (branch_id, session_id, order_channel, cart_status) VALUES (?, ?, ?, 'ACTIVE')`,
      [String(branchId), sessionId, channel],
    );

    const [rows]: any = await pool.query(`SELECT * FROM carts WHERE cart_id = ?`, [result.insertId]);
    return this.mapRow(rows[0]);
  }

  async findByCartKey(cartKey: string): Promise<Cart | null> {
    const [rows]: any = await pool.query(`SELECT * FROM carts WHERE cart_key = ? LIMIT 1`, [cartKey]);
    const r = rows?.[0];
    if (!r) return null;
    return this.mapRow(r);
  }

  async markCheckedOut(cartId: string): Promise<void> {
    await pool.query(`UPDATE carts SET cart_status = 'CHECKED_OUT' WHERE cart_id = ?`, [cartId]);
  }

  async markAbandoned(cartId: string): Promise<void> {
    await pool.query(
      `UPDATE carts SET cart_status = 'ABANDONED' WHERE cart_id = ? AND cart_status = 'ACTIVE'`,
      [cartId],
    );
  }
}
