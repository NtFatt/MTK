import type {
  IOrderRepository,
  LiveDineInOrderSummary,
  OrderStatusHistoryActor,
  OrderRealtimeScope,
  UnpaidDineInConflict,
} from "../../../../application/ports/repositories/IOrderRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";
import type { PoolConnection } from "mysql2/promise";

export class MySQLOrderRepository implements IOrderRepository {
  private mapLiveDineInOrderRow(row: any): LiveDineInOrderSummary {
    return {
      orderId: String(row.order_id),
      orderCode: String(row.order_code),
      orderStatus: String(row.order_status) as OrderStatus,
      sessionId: row.session_id ? String(row.session_id) : null,
      subtotalAmount: Number(row.subtotal_amount ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      voucherId: row.voucher_id_snapshot ? String(row.voucher_id_snapshot) : null,
      voucherCode: row.voucher_code_snapshot ? String(row.voucher_code_snapshot) : null,
      voucherName: row.voucher_name_snapshot ? String(row.voucher_name_snapshot) : null,
      voucherDiscountType: row.voucher_discount_type
        ? String(row.voucher_discount_type) as LiveDineInOrderSummary["voucherDiscountType"]
        : null,
      voucherDiscountValue:
        row.voucher_discount_value === null || row.voucher_discount_value === undefined
          ? null
          : Number(row.voucher_discount_value),
      voucherDiscountAmount: Number(row.voucher_discount_amount ?? 0),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private async findUnpaidDineInConflict(input: {
    joinSql?: string;
    whereSql: string;
    params: Array<string>;
  }): Promise<UnpaidDineInConflict | null> {
    const joinSql = input.joinSql ? ` ${input.joinSql} ` : " ";
    const whereSql = input.whereSql.trim();
    const baseParams = [...input.params];

    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) AS unresolved_count
       FROM orders o
       ${joinSql}
       WHERE ${whereSql}
         AND o.order_channel = 'DINE_IN'
         AND o.order_status NOT IN ('PAID', 'CANCELED')`,
      baseParams,
    );

    const count = Number(countRows?.[0]?.unresolved_count ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;

    const [latestRows]: any = await pool.query(
      `SELECT o.order_code, o.order_status, o.updated_at
       FROM orders o
       ${joinSql}
       WHERE ${whereSql}
         AND o.order_channel = 'DINE_IN'
         AND o.order_status NOT IN ('PAID', 'CANCELED')
       ORDER BY o.updated_at DESC, o.order_id DESC
       LIMIT 1`,
      baseParams,
    );

    const latest = latestRows?.[0];
    return {
      count,
      latestOrderCode: latest?.order_code ? String(latest.order_code) : null,
      latestOrderStatus: latest?.order_status ? String(latest.order_status) as OrderStatus : null,
      latestUpdatedAt: latest?.updated_at ? new Date(latest.updated_at).toISOString() : null,
    };
  }

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
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    voucherCode: string | null;
    voucherName: string | null;
    voucherDiscountAmount: number;
    updatedAt: string;
  } | null> {
    const [rows]: any = await pool.query(
      `SELECT order_code, order_status, subtotal_amount, discount_amount, total_amount,
              voucher_code_snapshot, voucher_name_snapshot, voucher_discount_amount, updated_at
       FROM orders WHERE order_code = ? LIMIT 1`,
      [orderCode],
    );
    const r = rows?.[0];
    if (!r) return null;

    return {
      orderCode: r.order_code,
      orderStatus: r.order_status as OrderStatus,
      subtotalAmount: Number(r.subtotal_amount ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
      totalAmount: Number(r.total_amount ?? 0),
      voucherCode: r.voucher_code_snapshot ? String(r.voucher_code_snapshot) : null,
      voucherName: r.voucher_name_snapshot ? String(r.voucher_name_snapshot) : null,
      voucherDiscountAmount: Number(r.voucher_discount_amount ?? 0),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }



  async findStatusByOrderCodeForBranch(orderCode: string, branchId: string): Promise<{
    orderCode: string;
    orderStatus: OrderStatus;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    voucherCode: string | null;
    voucherName: string | null;
    voucherDiscountAmount: number;
    updatedAt: string;
  } | null> {
    const [rows]: any = await pool.query(
      `SELECT order_code, order_status, subtotal_amount, discount_amount, total_amount,
              voucher_code_snapshot, voucher_name_snapshot, voucher_discount_amount, updated_at
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
      subtotalAmount: Number(r.subtotal_amount ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
      totalAmount: Number(r.total_amount ?? 0),
      voucherCode: r.voucher_code_snapshot ? String(r.voucher_code_snapshot) : null,
      voucherName: r.voucher_name_snapshot ? String(r.voucher_name_snapshot) : null,
      voucherDiscountAmount: Number(r.voucher_discount_amount ?? 0),
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

  async findLatestLiveDineInOrderBySessionId(sessionId: string): Promise<LiveDineInOrderSummary | null> {
    const [rows]: any = await pool.query(
      `SELECT
          order_id,
          order_code,
          order_status,
          session_id,
          subtotal_amount,
          discount_amount,
          total_amount,
          voucher_id_snapshot,
          voucher_code_snapshot,
          voucher_name_snapshot,
          voucher_discount_type,
          voucher_discount_value,
          voucher_discount_amount,
          created_at,
          updated_at
       FROM orders
       WHERE session_id = ?
         AND order_channel = 'DINE_IN'
         AND order_status NOT IN ('PAID', 'CANCELED')
       ORDER BY updated_at DESC, order_id DESC
       LIMIT 1`,
      [sessionId],
    );

    const row = rows?.[0];
    return row ? this.mapLiveDineInOrderRow(row) : null;
  }

  async findUnpaidDineInConflictByTableId(tableId: string): Promise<UnpaidDineInConflict | null> {
    return this.findUnpaidDineInConflict({
      joinSql: "JOIN table_sessions s ON s.session_id = o.session_id",
      whereSql: "s.table_id = ?",
      params: [tableId],
    });
  }

  async findUnpaidDineInConflictBySessionId(sessionId: string): Promise<UnpaidDineInConflict | null> {
    return this.findUnpaidDineInConflict({
      whereSql: "o.session_id = ?",
      params: [sessionId],
    });
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
