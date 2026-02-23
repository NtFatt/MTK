import type {
  IOrderCheckoutService,
  CheckoutFromCartInput,
  CheckoutFromCartResult,
} from "../../../../application/ports/services/IOrderCheckoutService.js";
import { pool } from "../connection.js";
import { MySQLMenuItemStockRepository } from "../repositories/MySQLMenuItemStockRepository.js";

export class MySQLOrderCheckoutService implements IOrderCheckoutService {
  constructor(private readonly stockRepo: MySQLMenuItemStockRepository) {}

  async checkoutFromCart(input: CheckoutFromCartInput): Promise<CheckoutFromCartResult> {
    const cart = input.cart;
    const items = input.items;
    if (!items?.length) throw new Error("CART_EMPTY");

    const branchId = cart.branchId ? String(cart.branchId) : null;
    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const conn: any = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Create order (status NEW)
      const [orderRes]: any = await conn.query(
        `INSERT INTO orders (branch_id, session_id, client_id, order_code, order_channel, order_status, note)
         VALUES (?, ?, ?, ?, ?, 'NEW', ?)`,
        [
          branchId,
          cart.sessionId ? String(cart.sessionId) : null,
          cart.clientId ? String(cart.clientId) : null,
          input.orderCode,
          cart.orderChannel,
          input.note ?? null,
        ],
      );

      const orderId = String(orderRes.insertId);

      // 2) Status history (UPDATED SCHEMA)
      // Sử dụng changed_by_type và changed_by_id thay vì changed_by
      await conn.query(
        `INSERT INTO order_status_history
          (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
         VALUES
          (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          null,              // from_status (new order)
          "NEW",             // to_status
          "SYSTEM",          // changed_by_type: SYSTEM/CLIENT/ADMIN
          null,              // changed_by_id (SYSTEM => null)
          input.note ?? null // note (lưu lại ghi chú của order vào history dòng đầu tiên nếu muốn)
        ],
      );

      // 3) Insert order items
      const values: any[] = [];
      const placeholders: string[] = [];
      for (const it of items) {
        const qty = Number(it.quantity);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("INVALID_QUANTITY");

        const unitPrice = Number(it.unitPrice);
        const lineTotal = unitPrice * qty;

        placeholders.push("(?, ?, ?, ?, ?, ?, ?)");
        values.push(
          orderId,
          String(it.itemId),
          String((it as any).itemName ?? ""),
          unitPrice,
          qty,
          it.itemOptions ? JSON.stringify(it.itemOptions) : null,
          lineTotal,
        );
      }

      if (values.length > 0) {
        await conn.query(
          `INSERT INTO order_items (order_id, item_id, item_name, unit_price, quantity, item_options, line_total)
           VALUES ${placeholders.join(", ")}`,
          values,
        );
      }

      // 4) Decrement stock atomically per item
      const agg = new Map<string, number>();
      for (const it of items) {
        const key = String(it.itemId);
        const qty = Number(it.quantity);
        agg.set(key, (agg.get(key) ?? 0) + qty);
      }

      for (const [itemId, qty] of agg.entries()) {
        // Giả sử stockRepo.decrementIfEnough nhận conn để chạy trong transaction này
        // Nếu hàm này chưa hỗ trợ transaction connection, bạn cần sửa lại repo đó.
        const ok = await this.stockRepo.decrementIfEnough(conn, branchId, itemId, qty);
        if (!ok) throw new Error("OUT_OF_STOCK");
      }

      // 5) Checkout cart
      await conn.query(`UPDATE carts SET cart_status = 'CHECKED_OUT' WHERE cart_id = ?`, [String(cart.id)]);

      await conn.commit();
      return { orderId, orderCode: input.orderCode };
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback error
      }
      throw err;
    } finally {
      try {
        conn.release();
      } catch {
        // ignore release error
      }
    }
  }
}