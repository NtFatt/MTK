import type { IAdminOrderRepository } from "../../../../application/ports/repositories/IAdminOrderRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";
import {
  consumeOrderInventory,
  restockCanceledOrderInventory,
} from "../services/orderInventoryMutations.js";
import { MySQLVoucherRepository } from "./MySQLVoucherRepository.js";

function kitchenStatusRank(status: string): number {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "READY") return 4;
  if (normalized === "PREPARING") return 3;
  if (normalized === "RECEIVED") return 2;
  if (normalized === "NEW") return 1;
  return 0;
}

function toAggregateOrderStatus(statuses: string[]): OrderStatus {
  let best = "NEW";
  let bestRank = 0;

  for (const status of statuses) {
    const rank = kitchenStatusRank(status);
    if (rank > bestRank) {
      bestRank = rank;
      best = String(status).trim().toUpperCase();
    }
  }

  return (best || "NEW") as OrderStatus;
}

export class MySQLAdminOrderRepository implements IAdminOrderRepository {
  private readonly voucherRepo = new MySQLVoucherRepository();

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
    changedByType: "ADMIN" | "STAFF" | "CLIENT" | "SYSTEM";
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

  async transitionKitchenItemGroupStatus(input: {
    orderCode: string;
    branchId: string;
    fromKitchenStatus: "NEW" | "RECEIVED" | "PREPARING";
    toKitchenStatus: "RECEIVED" | "PREPARING" | "READY";
  }) {
    const conn: any = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [orderRows]: any = await conn.query(
        `
          SELECT order_id, order_status
          FROM orders
          WHERE order_code = ? AND branch_id = ?
          FOR UPDATE
        `,
        [input.orderCode, input.branchId],
      );

      const order = orderRows?.[0];
      if (!order) throw new Error("ORDER_NOT_FOUND");

      const currentOrderStatus = String(order.order_status ?? "").trim().toUpperCase();
      if (currentOrderStatus === "PAID" || currentOrderStatus === "CANCELED" || currentOrderStatus === "COMPLETED") {
        throw new Error("INVALID_TRANSITION");
      }

      const [groupRows]: any = await conn.query(
        `
          SELECT order_item_id
          FROM order_items
          WHERE order_id = ?
            AND kitchen_status = ?
          FOR UPDATE
        `,
        [String(order.order_id), input.fromKitchenStatus],
      );

      const affectedItemCount = Array.isArray(groupRows) ? groupRows.length : 0;
      if (affectedItemCount === 0) {
        throw new Error("KITCHEN_TICKET_NOT_FOUND");
      }

      const fields: string[] = ["kitchen_status = ?"];
      const params: any[] = [input.toKitchenStatus];

      if (input.toKitchenStatus === "RECEIVED") {
        fields.push("kitchen_received_at = NOW()");
      }
      if (input.toKitchenStatus === "PREPARING") {
        fields.push("kitchen_preparing_at = NOW()");
      }
      if (input.toKitchenStatus === "READY") {
        fields.push("kitchen_ready_at = NOW()");
      }

      await conn.query(
        `
          UPDATE order_items
          SET ${fields.join(", ")}
          WHERE order_id = ?
            AND kitchen_status = ?
        `,
        [...params, String(order.order_id), input.fromKitchenStatus],
      );

      const [statusRows]: any = await conn.query(
        `
          SELECT DISTINCT kitchen_status
          FROM order_items
          WHERE order_id = ?
            AND kitchen_status IN ('NEW', 'RECEIVED', 'PREPARING', 'READY')
        `,
        [String(order.order_id)],
      );

      const aggregateOrderStatus = toAggregateOrderStatus(
        (statusRows ?? []).map((row: any) => String(row.kitchen_status ?? "")),
      );

      const orderFields: string[] = ["order_status = ?", "updated_at = CURRENT_TIMESTAMP"];
      const orderParams: any[] = [aggregateOrderStatus];

      if (input.toKitchenStatus === "RECEIVED") {
        orderFields.push("accepted_at = NOW()");
      }
      if (input.toKitchenStatus === "PREPARING") {
        orderFields.push("prepared_at = NOW()");
      }

      await conn.query(
        `
          UPDATE orders
          SET ${orderFields.join(", ")}
          WHERE order_id = ?
        `,
        [...orderParams, String(order.order_id)],
      );

      await conn.commit();

      return {
        orderCode: input.orderCode,
        fromKitchenStatus: input.fromKitchenStatus,
        toKitchenStatus: input.toKitchenStatus,
        affectedItemCount,
        aggregateOrderStatus,
      };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async transitionToPreparingWithInventoryConsumption(input: {
    orderCode: string;
    branchId: string;
    changedById: string;
    note: string | null;
  }) {
    const conn: any = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1) Lock order
      const [orderRows]: any = await conn.query(
        `
      SELECT order_id, order_code, branch_id, order_status
      FROM orders
      WHERE order_code = ? AND branch_id = ?
      FOR UPDATE
      `,
        [input.orderCode, input.branchId],
      );

      const order = orderRows?.[0];
      if (!order) throw new Error("ORDER_NOT_FOUND");

      if (String(order.order_status) !== "RECEIVED") {
        throw new Error("INVALID_TRANSITION");
      }

      const orderId = String(order.order_id);

      // 2) Legacy-safe consumption:
      // - new orders already consumed at ORDER_CREATED -> no-op here
      // - old in-flight orders without consumption -> deduct now
      const inventoryResult = await consumeOrderInventory(conn, {
        orderId,
        branchId: input.branchId,
        triggerStatus: "PREPARING",
      });

      // 3) Update order status
      await conn.query(
        `
      UPDATE orders
      SET order_status = 'PREPARING',
          prepared_at = COALESCE(prepared_at, NOW()),
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
      `,
        [orderId],
      );

      await conn.commit();

      return {
        orderCode: input.orderCode,
        toStatus: "PREPARING" as const,
        inventoryChanged: inventoryResult.inventoryChanged,
        inventoryTriggerStatus: inventoryResult.triggerStatus,
        affectedMenuItemIds: inventoryResult.affectedMenuItemIds,
        consumedLines: inventoryResult.ingredientTotals,
      };
    } catch (e: any) {
      await conn.rollback();

      // unique key uq_inventory_consumption_once
      if (e?.code === "ER_DUP_ENTRY") {
        throw new Error("DUPLICATE_CONSUMPTION");
      }

      throw e;
    } finally {
      conn.release();
    }
  }

  async cancelWithInventoryRestockIfApplicable(input: {
    orderCode: string;
    branchId: string;
    changedByType: "ADMIN" | "STAFF";
    changedById: string | null;
    note: string | null;
  }) {
    const conn: any = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [orderRows]: any = await conn.query(
        `
          SELECT order_id, order_status
          FROM orders
          WHERE order_code = ? AND branch_id = ?
          FOR UPDATE
        `,
        [input.orderCode, input.branchId],
      );

      const order = orderRows?.[0];
      if (!order) throw new Error("ORDER_NOT_FOUND");

      const orderId = String(order.order_id);
      const currentStatus = String(order.order_status ?? "") as OrderStatus;

      let inventoryResult = {
        inventoryChanged: false,
        alreadyApplied: false,
        triggerStatus: null as string | null,
        ingredientTotals: [] as Array<{ ingredientId: string; qtyConsumed: number }>,
        affectedMenuItemIds: [] as string[],
      };

      if (currentStatus === "NEW" || currentStatus === "RECEIVED") {
        const reason =
          input.note?.trim() ||
          `Order canceled before preparing (${input.orderCode})`;

        const restocked = await restockCanceledOrderInventory(conn, {
          orderId,
          branchId: input.branchId,
          actorType: input.changedByType,
          actorId: input.changedById,
          reason,
        });

        inventoryResult = {
          inventoryChanged: restocked.inventoryChanged,
          alreadyApplied: restocked.alreadyApplied,
          triggerStatus: restocked.triggerStatus,
          ingredientTotals: restocked.ingredientTotals,
          affectedMenuItemIds: restocked.affectedMenuItemIds,
        };

        await this.voucherRepo.reverseUsageForOrder(orderId, { conn });
      }

      await conn.query(
        `
          UPDATE orders
          SET order_status = 'CANCELED',
              canceled_at = COALESCE(canceled_at, NOW()),
              updated_at = CURRENT_TIMESTAMP
          WHERE order_id = ?
        `,
        [orderId],
      );

      await conn.commit();

      return {
        orderCode: input.orderCode,
        toStatus: "CANCELED" as const,
        inventoryChanged: inventoryResult.inventoryChanged,
        inventoryTriggerStatus: inventoryResult.triggerStatus,
        affectedMenuItemIds: inventoryResult.affectedMenuItemIds,
        restoredLines: inventoryResult.ingredientTotals,
      };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}
