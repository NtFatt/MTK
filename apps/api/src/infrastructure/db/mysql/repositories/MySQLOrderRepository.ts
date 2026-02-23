import type {
  IOrderRepository,
  OrderStatusHistoryActor,
  OrderRealtimeScope,
} from "../../../../application/ports/repositories/IOrderRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";
import type { PoolConnection } from "mysql2/promise";

export class MySQLOrderRepository implements IOrderRepository {
  async create(input: {
    orderCode: string;
    clientId: string | null;
    sessionId: string | null;
    deliveryAddressId: string | null;
    orderChannel: "DINE_IN" | "DELIVERY";
    discountPercentApplied: number;
    deliveryFee: number;
    note: string | null;
  }): Promise<{ orderId: string }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const discountPercentApplied = input.discountPercentApplied ?? 0;
      const deliveryFee = input.deliveryFee ?? 0;

      // 1. Insert Order
      const [result]: any = await conn.query(
        `INSERT INTO orders
         (order_code, client_id, session_id, delivery_address_id, order_channel, order_status, note,
          rank_id_snapshot, discount_percent_applied, delivery_fee)
         VALUES (?, ?, ?, ?, ?, 'NEW', ?, NULL, ?, ?)`,
        [
          input.orderCode,
          input.clientId ?? null,
          input.sessionId ?? null,
          input.deliveryAddressId ?? null,
          input.orderChannel,
          input.note ?? null,
          discountPercentApplied,
          deliveryFee,
        ],
      );

      const orderId = String(result.insertId);

      // 2. Insert Initial Status History
      // Logic cập nhật theo yêu cầu:
      const toStatus = "NEW";
      const changedByType: OrderStatusHistoryActor = input.clientId ? "CLIENT" : "SYSTEM";
      const changedById = input.clientId ?? null;

      await conn.query(
        `INSERT INTO order_status_history
         (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          null,           // from_status (Ban đầu là null)
          toStatus,       // to_status ('NEW')
          changedByType,  // changed_by_type ('CLIENT' or 'SYSTEM')
          changedById,    // changed_by_id
          null,           // note (null theo snippet)
        ],
      );

      await conn.commit();
      return { orderId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async findStatusByOrderCode(orderCode: string): Promise<{
    orderCode: string;
    orderStatus: OrderStatus;
    updatedAt: string;
  } | null> {
    const [rows]: any = await pool.query(
      `SELECT order_code, order_status, updated_at
       FROM orders WHERE order_code = ? LIMIT 1`,
      [orderCode],
    );
    const r = rows?.[0];
    if (!r) return null;

    return {
      orderCode: r.order_code,
      orderStatus: r.order_status as OrderStatus,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }



  async findStatusByOrderCodeForBranch(orderCode: string, branchId: string): Promise<{
    orderCode: string;
    orderStatus: OrderStatus;
    updatedAt: string;
  } | null> {
    const [rows]: any = await pool.query(
      `SELECT order_code, order_status, updated_at
       FROM orders
       WHERE order_code = ? AND branch_id = ?
       LIMIT 1`,
      [orderCode, branchId],
    );
    const r = rows?.[0];
    if (!r) return null;

    return {
      orderCode: r.order_code,
      orderStatus: r.order_status as OrderStatus,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  async getRealtimeScopeByOrderCodeForBranch(orderCode: string, branchId: string): Promise<OrderRealtimeScope | null> {
    const [rows]: any = await pool.query(
      `SELECT o.order_id, o.session_id, s.table_id,
              COALESCE(rt.branch_id, o.branch_id) AS branch_id
       FROM orders o
       LEFT JOIN table_sessions s ON s.session_id = o.session_id
       LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
       WHERE o.order_code = ?
         AND COALESCE(rt.branch_id, o.branch_id) = ?
       LIMIT 1`,
      [orderCode, branchId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return {
      orderId: String(r.order_id),
      sessionId: r.session_id ? String(r.session_id) : null,
      tableId: r.table_id ? String(r.table_id) : null,
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
    };
  }
  async getRealtimeScopeByOrderCode(orderCode: string): Promise<OrderRealtimeScope | null> {
    const [rows]: any = await pool.query(
      `SELECT o.order_id, o.session_id, s.table_id,
              COALESCE(rt.branch_id, o.branch_id) AS branch_id
       FROM orders o
       LEFT JOIN table_sessions s ON s.session_id = o.session_id
       LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
       WHERE o.order_code = ?
       LIMIT 1`,
      [orderCode],
    );
    const r = rows?.[0];
    if (!r) return null;
    return {
      orderId: String(r.order_id),
      sessionId: r.session_id ? String(r.session_id) : null,
      tableId: r.table_id ? String(r.table_id) : null,
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
    };
  }



  async getRealtimeScopeByOrderId(orderId: string): Promise<OrderRealtimeScope | null> {
    const [rows]: any = await pool.query(
      `SELECT o.order_id, o.session_id, s.table_id,
              COALESCE(rt.branch_id, o.branch_id) AS branch_id
       FROM orders o
       LEFT JOIN table_sessions s ON s.session_id = o.session_id
       LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
       WHERE o.order_id = ?
       LIMIT 1`,
      [orderId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return {
      orderId: String(r.order_id),
      sessionId: r.session_id ? String(r.session_id) : null,
      tableId: r.table_id ? String(r.table_id) : null,
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
    };
  }
  async setPaidByOrderCode(orderCode: string): Promise<void> {
    await pool.query(
      `UPDATE orders
       SET order_status = 'PAID', paid_at = COALESCE(paid_at, NOW()), updated_at = CURRENT_TIMESTAMP
       WHERE order_code = ?`,
      [orderCode],
    );
  }

  async markPaidWithHistory(input: {
    orderCode: string;
    changedByType: OrderStatusHistoryActor;
    changedById: string | null;
    note: string | null;
  }): Promise<{ changed: boolean; fromStatus: OrderStatus; toStatus: OrderStatus }> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check existence & lock row
      const [rows]: any = await conn.query(
        `SELECT order_id, order_status
         FROM orders
         WHERE order_code = ?
         FOR UPDATE`,
        [input.orderCode],
      );
      const r = rows?.[0];
      if (!r) throw new Error("ORDER_NOT_FOUND");

      const orderId = String(r.order_id);
      const fromStatus = String(r.order_status) as OrderStatus;

      // Idempotent check
      if (fromStatus === "PAID") {
        await conn.commit();
        return { changed: false, fromStatus: "PAID", toStatus: "PAID" };
      }

      // Update status
      await conn.query(
        `UPDATE orders
         SET order_status = 'PAID',
             paid_at = COALESCE(paid_at, NOW()),
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [orderId],
      );

      // Insert history
      await conn.query(
        `INSERT INTO order_status_history
         (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
         VALUES (?, ?, 'PAID', ?, ?, ?)`,
        [orderId, fromStatus, input.changedByType, input.changedById, input.note],
      );

      await conn.commit();
      return { changed: true, fromStatus, toStatus: "PAID" };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}