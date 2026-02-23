import type { IAdminOrderRepository } from "../../../../application/ports/repositories/IAdminOrderRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";

export class MySQLAdminOrderRepository implements IAdminOrderRepository {
  async getStatusByOrderCode(orderCode: string): Promise<OrderStatus | null> {
    const [rows]: any = await pool.query(
      `SELECT order_status FROM orders WHERE order_code = ? LIMIT 1`,
      [orderCode],
    );
    const r = rows?.[0];
    return r ? (r.order_status as OrderStatus) : null;
  }


  async getStatusByOrderCodeForBranch(orderCode: string, branchId: string): Promise<OrderStatus | null> {
    const [rows]: any = await pool.query(
      `SELECT order_status FROM orders WHERE order_code = ? AND branch_id = ? LIMIT 1`,
      [orderCode, branchId],
    );
    const r = rows?.[0];
    return r ? (r.order_status as OrderStatus) : null;
  }

  async getRealtimeScopeByOrderCode(orderCode: string) {
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

  async getRealtimeScopeByOrderCodeForBranch(orderCode: string, branchId: string) {
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


  async updateStatusByOrderCode(input: {
    orderCode: string;
    toStatus: OrderStatus;
    setTimeFields: Partial<{
      acceptedAt: boolean;
      preparedAt: boolean;
      completedAt: boolean;
      canceledAt: boolean;
    }>;
  }): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // lock row để tránh 2 admin update đè nhau
      const [rows]: any = await conn.query(
        `SELECT order_id FROM orders WHERE order_code = ? FOR UPDATE`,
        [input.orderCode],
      );
      if (!rows?.[0]) throw new Error("ORDER_NOT_FOUND");

      const fields: string[] = [`order_status = ?`, `updated_at = CURRENT_TIMESTAMP`];
      const params: any[] = [input.toStatus];

      if (input.setTimeFields.acceptedAt) fields.push(`accepted_at = COALESCE(accepted_at, NOW())`);
      if (input.setTimeFields.preparedAt) fields.push(`prepared_at = COALESCE(prepared_at, NOW())`);
      if (input.setTimeFields.completedAt) fields.push(`completed_at = COALESCE(completed_at, NOW())`);
      if (input.setTimeFields.canceledAt) fields.push(`canceled_at = COALESCE(canceled_at, NOW())`);

      await conn.query(
        `UPDATE orders SET ${fields.join(", ")} WHERE order_code = ?`,
        [...params, input.orderCode],
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async updateStatusByOrderCodeForBranch(input: {
    orderCode: string;
    branchId: string;
    toStatus: OrderStatus;
    setTimeFields: Partial<{
      acceptedAt: boolean;
      preparedAt: boolean;
      completedAt: boolean;
      canceledAt: boolean;
    }>;
  }): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT order_id FROM orders WHERE order_code = ? AND branch_id = ? FOR UPDATE`,
        [input.orderCode, input.branchId],
      );
      if (!rows?.[0]) throw new Error("FORBIDDEN");

      const fields: string[] = [`order_status = ?`, `updated_at = CURRENT_TIMESTAMP`];
      const params: any[] = [input.toStatus];

      if (input.setTimeFields.acceptedAt) fields.push(`accepted_at = COALESCE(accepted_at, NOW())`);
      if (input.setTimeFields.preparedAt) fields.push(`prepared_at = COALESCE(prepared_at, NOW())`);
      if (input.setTimeFields.completedAt) fields.push(`completed_at = COALESCE(completed_at, NOW())`);
      if (input.setTimeFields.canceledAt) fields.push(`canceled_at = COALESCE(canceled_at, NOW())`);

      await conn.query(
        `UPDATE orders SET ${fields.join(", ")} WHERE order_code = ? AND branch_id = ?`,
        [...params, input.orderCode, input.branchId],
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }


  async insertStatusHistory(input: {
    orderCode: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    changedByType: "ADMIN" | "CLIENT" | "SYSTEM";
    changedById: string | null;
    note: string | null;
  }): Promise<void> {
    // lấy order_id từ order_code
    const [rows]: any = await pool.query(
      `SELECT order_id FROM orders WHERE order_code = ? LIMIT 1`,
      [input.orderCode],
    );
    const orderId = rows?.[0]?.order_id;
    if (!orderId) throw new Error("ORDER_NOT_FOUND");

    await pool.query(
      `INSERT INTO order_status_history
       (order_id, from_status, to_status, changed_by_type, changed_by_id, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, input.fromStatus, input.toStatus, input.changedByType, input.changedById, input.note],
    );
  }
}
