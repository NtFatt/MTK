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

      // 2) Load order items
      const [orderItemRows]: any = await conn.query(
        `
      SELECT order_item_id, item_id AS menu_item_id, quantity
      FROM order_items
      WHERE order_id = ?
      `,
        [orderId],
      );

      if (!orderItemRows?.length) {
        throw new Error("ORDER_ITEMS_EMPTY");
      }

      // 3) Load recipes
      const menuItemIds = [...new Set(orderItemRows.map((r: any) => String(r.menu_item_id)))];
      const menuItemPlaceholders = menuItemIds.map(() => "?").join(",");

      const [recipeRows]: any = await conn.query(
        `
      SELECT menu_item_id, ingredient_id, qty_per_item, unit
      FROM menu_item_recipes
      WHERE menu_item_id IN (${menuItemPlaceholders})
      `,
        menuItemIds,
      );

      // 4) Check missing recipe
      for (const menuItemId of menuItemIds) {
        const hasRecipe = recipeRows.some((r: any) => String(r.menu_item_id) === String(menuItemId));
        if (!hasRecipe) {
          throw new Error("RECIPE_NOT_CONFIGURED");
        }
      }

      // 5) Build required ingredient totals
      const requiredByIngredient = new Map<string, number>();
      const consumptionRows: Array<{
        orderItemId: string;
        menuItemId: string;
        ingredientId: string;
        qtyConsumed: number;
      }> = [];

      for (const item of orderItemRows) {
        const orderItemId = String(item.order_item_id);
        const menuItemId = String(item.menu_item_id);
        const quantity = Number(item.quantity ?? 0);

        const itemRecipes = recipeRows.filter(
          (r: any) => String(r.menu_item_id) === menuItemId,
        );

        for (const recipe of itemRecipes) {
          const ingredientId = String(recipe.ingredient_id);
          const qtyPerItem = Number(recipe.qty_per_item ?? 0);
          const qtyConsumed = quantity * qtyPerItem;

          requiredByIngredient.set(
            ingredientId,
            (requiredByIngredient.get(ingredientId) ?? 0) + qtyConsumed,
          );

          consumptionRows.push({
            orderItemId,
            menuItemId,
            ingredientId,
            qtyConsumed,
          });
        }
      }

      const ingredientIds = [...requiredByIngredient.keys()];
      const ingredientPlaceholders = ingredientIds.map(() => "?").join(",");

      // 6) Lock inventory rows
      const [inventoryRows]: any = await conn.query(
        `
      SELECT id, current_qty
      FROM inventory_items
      WHERE branch_id = ?
        AND id IN (${ingredientPlaceholders})
      FOR UPDATE
      `,
        [input.branchId, ...ingredientIds],
      );

      const inventoryMap = new Map<string, any>(
        (inventoryRows ?? []).map((r: any) => [String(r.id), r]),
      );

      for (const ingredientId of ingredientIds) {
        const inv = inventoryMap.get(ingredientId);
        if (!inv) {
          throw new Error("RECIPE_INGREDIENT_NOT_FOUND");
        }

        const currentQty = Number(inv.current_qty ?? 0);
        const requiredQty = Number(requiredByIngredient.get(ingredientId) ?? 0);

        if (currentQty < requiredQty) {
          throw new Error("INSUFFICIENT_INGREDIENT");
        }
      }

      // 7) Insert consumption ledger
      for (const row of consumptionRows) {
        await conn.query(
          `
        INSERT INTO inventory_consumptions
        (branch_id, order_id, order_item_id, menu_item_id, ingredient_id, qty_consumed, trigger_status)
        VALUES (?, ?, ?, ?, ?, ?, 'PREPARING')
        `,
          [
            input.branchId,
            orderId,
            row.orderItemId,
            row.menuItemId,
            row.ingredientId,
            row.qtyConsumed,
          ],
        );
      }

      // 8) Deduct inventory
      for (const [ingredientId, requiredQty] of requiredByIngredient.entries()) {
        await conn.query(
          `
        UPDATE inventory_items
        SET current_qty = current_qty - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND branch_id = ?
        `,
          [requiredQty, ingredientId, input.branchId],
        );
      }

      // 9) Update order status
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
        consumedLines: Array.from(requiredByIngredient.entries()).map(
          ([ingredientId, qtyConsumed]) => ({
            ingredientId,
            qtyConsumed,
          }),
        ),
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
}