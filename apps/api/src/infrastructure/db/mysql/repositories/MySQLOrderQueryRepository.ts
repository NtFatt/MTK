import type {
  IOrderQueryRepository,
  KitchenQueueIngredientRow,
  KitchenQueueItemRow,
  OrderListRow,
} from "../../../../application/ports/repositories/IOrderQueryRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";

function toIso(v: any): string {
  try {
    return new Date(v).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function toNullableIso(v: any): string | null {
  if (v == null || v === "") return null;
  return toIso(v);
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

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

function normalizeStatuses(statuses: OrderStatus[]): OrderStatus[] {
  const set = new Set<OrderStatus>();
  for (const s of statuses ?? []) {
    const v = String(s ?? "").toUpperCase() as OrderStatus;
    // Only allow defined enum values
    if (
      v === "NEW" || v === "RECEIVED" || v === "PREPARING" || v === "READY" || v === "SERVING" ||
      v === "DELIVERING" || v === "COMPLETED" || v === "CANCELED" || v === "PAID"
    ) {
      set.add(v);
    }
  }
  return [...set];
}

export class MySQLOrderQueryRepository implements IOrderQueryRepository {
  async listOrders(input: {
    branchId?: string | null;
    statuses?: OrderStatus[];
    q?: string | null;
    limit: number;
  }): Promise<OrderListRow[]> {
    const statuses = normalizeStatuses(input.statuses ?? []);
    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 100))));
    const where: string[] = [];
    const params: any[] = [];

    if (input.branchId) {
      where.push("rt.branch_id = ?");
      params.push(String(input.branchId));
    }

    if (statuses.length > 0) {
      where.push(`o.order_status IN (${statuses.map(() => "?").join(",")})`);
      params.push(...statuses);
    }

    const keyword = String(input.q ?? "").trim();
    if (keyword) {
      const like = `%${keyword}%`;
      where.push(`(
        o.order_code LIKE ?
        OR COALESCE(rt.table_code, '') LIKE ?
        OR COALESCE(o.voucher_code_snapshot, '') LIKE ?
        OR COALESCE(o.voucher_name_snapshot, '') LIKE ?
        OR COALESCE(o.note, '') LIKE ?
        OR EXISTS (
          SELECT 1
          FROM order_items oi_search
          WHERE oi_search.order_id = o.order_id
            AND oi_search.item_name LIKE ?
        )
      )`);
      params.push(like, like, like, like, like, like);
    }

    params.push(limit);

    const sql = `
      SELECT
        o.order_id,
        o.order_code,
        o.order_status,
        o.created_at,
        o.updated_at,
        o.note,
        o.subtotal_amount,
        o.discount_amount,
        o.total_amount,
        o.voucher_code_snapshot,
        o.voucher_name_snapshot,
        rt.branch_id,
        rt.table_code,
        s.opened_at AS session_opened_at
      FROM orders o
      LEFT JOIN table_sessions s ON s.session_id = o.session_id
      LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY o.updated_at DESC, o.order_id DESC
      LIMIT ?
    `;

    const [rows]: any = await pool.query(sql, params);
    const baseRows: OrderListRow[] = (rows ?? []).map((r: any) => ({
      orderId: String(r.order_id),
      orderCode: String(r.order_code),
      orderStatus: String(r.order_status) as OrderStatus,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
      tableCode: r.table_code ? String(r.table_code) : null,
      sessionOpenedAt: toNullableIso(r.session_opened_at),
      subtotalAmount: Number(r.subtotal_amount ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
      totalAmount: Number(r.total_amount ?? 0),
      voucherCode: r.voucher_code_snapshot ? String(r.voucher_code_snapshot) : null,
      voucherName: r.voucher_name_snapshot ? String(r.voucher_name_snapshot) : null,
      orderNote: r.note ? String(r.note) : null,
    }));

    if (baseRows.length === 0) {
      return [];
    }

    const orderIds = baseRows
      .map((row) => String(row.orderId ?? "").trim())
      .filter(Boolean);
    const itemPlaceholders = orderIds.map(() => "?").join(",");

    const [itemRows]: any = await pool.query(
      `SELECT order_id, order_item_id, item_id, item_name, quantity, unit_price, line_total, item_options, pricing_breakdown
       FROM order_items
       WHERE order_id IN (${itemPlaceholders})
       ORDER BY order_id ASC, order_item_id ASC`,
      orderIds,
    );

    const itemsByOrderId = new Map<string, KitchenQueueItemRow[]>();

    for (const row of itemRows ?? []) {
      const orderId = String(row.order_id);
      const current = itemsByOrderId.get(orderId) ?? [];

      current.push({
        orderItemId: String(row.order_item_id),
        itemId: String(row.item_id),
        itemName: String(row.item_name ?? `#${row.item_id}`),
        quantity: toInt(row.quantity),
        itemOptions: normalizeJson(row.item_options),
        unitPrice: Number(row.unit_price ?? 0),
        lineTotal: Number(row.line_total ?? 0),
        pricingBreakdown: normalizeJson(row.pricing_breakdown),
      });

      itemsByOrderId.set(orderId, current);
    }

    return baseRows.map((row) => {
      const items = itemsByOrderId.get(String(row.orderId)) ?? [];
      return {
        ...row,
        items,
        totalItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueItemCount: items.length,
      };
    });
  }

  async listKitchenQueue(input: {
    branchId?: string | null;
    statuses: OrderStatus[];
    limit: number;
  }): Promise<OrderListRow[]> {
    const statuses = normalizeStatuses(input.statuses);
    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 50))));

    // Default queue statuses if none provided
    const effectiveStatuses = statuses.length ? statuses : (["NEW", "RECEIVED", "PREPARING", "READY"] as OrderStatus[]);

    const where: string[] = ["o.order_status NOT IN ('PAID', 'CANCELED')"];
    const params: any[] = [];

    if (input.branchId) {
      where.push("rt.branch_id = ?");
      params.push(String(input.branchId));
    }

    where.push(`EXISTS (
      SELECT 1
      FROM order_items oi_scope
      WHERE oi_scope.order_id = o.order_id
        AND oi_scope.kitchen_status IN (${effectiveStatuses.map(() => "?").join(",")})
    )`);
    params.push(...effectiveStatuses);

    params.push(limit);

    const sql = `
      SELECT o.order_id, o.order_code, o.order_status, o.created_at, o.updated_at, o.note, rt.branch_id, rt.table_code
      FROM orders o
      LEFT JOIN table_sessions s ON s.session_id = o.session_id
      LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY o.updated_at DESC, o.order_id DESC
      LIMIT ?
    `;

    const [rows]: any = await pool.query(sql, params);
    const baseRows: OrderListRow[] = (rows ?? []).map((r: any) => ({
      orderId: String(r.order_id),
      orderCode: String(r.order_code),
      orderStatus: String(r.order_status) as OrderStatus,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
      orderNote: r.note ? String(r.note) : null,
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
      tableCode: r.table_code ? String(r.table_code) : null,
    }));

    if (baseRows.length === 0) {
      return [];
    }

    const orderIds = baseRows
      .map((row) => String(row.orderId ?? "").trim())
      .filter(Boolean);

    const itemPlaceholders = orderIds.map(() => "?").join(",");
    const [itemRows]: any = await pool.query(
      `SELECT order_id, order_item_id, item_id, item_name, quantity, item_options, kitchen_status
       FROM order_items
       WHERE order_id IN (${itemPlaceholders})
         AND kitchen_status IN (${effectiveStatuses.map(() => "?").join(",")})
       ORDER BY order_id ASC, order_item_id ASC`,
      [...orderIds, ...effectiveStatuses],
    );

    const branchIds = Array.from(
      new Set(
        baseRows
          .map((row) => row.branchId)
          .filter((branchId): branchId is string => typeof branchId === "string" && branchId.trim().length > 0),
      ),
    );
    const menuItemIds = Array.from(
      new Set(
        (Array.isArray(itemRows) ? itemRows : [])
          .map((row: any) => String(row.item_id ?? "").trim())
          .filter(Boolean),
      ),
    );

    const recipeMap = new Map<string, KitchenQueueIngredientRow[]>();
    if (branchIds.length > 0 && menuItemIds.length > 0) {
      const recipeSql = `
        SELECT r.menu_item_id, i.branch_id, r.ingredient_id, i.ingredient_name, r.qty_per_item, r.unit
        FROM menu_item_recipes r
        JOIN inventory_items i
          ON i.id = r.ingredient_id
         AND i.branch_id IN (${branchIds.map(() => "?").join(",")})
        WHERE r.menu_item_id IN (${menuItemIds.map(() => "?").join(",")})
        ORDER BY r.menu_item_id ASC, i.ingredient_name ASC
      `;
      const [recipeRows]: any = await pool.query(recipeSql, [...branchIds, ...menuItemIds]);

      for (const row of recipeRows ?? []) {
        const key = `${String(row.branch_id)}:${String(row.menu_item_id)}`;
        const current = recipeMap.get(key) ?? [];
        current.push({
          ingredientId: String(row.ingredient_id),
          ingredientName: String(row.ingredient_name),
          qtyPerItem: Number(row.qty_per_item ?? 0),
          unit: String(row.unit ?? ""),
        });
        recipeMap.set(key, current);
      }
    }

    const itemsByTicketKey = new Map<string, KitchenQueueItemRow[]>();
    const branchIdByOrderId = new Map<string, string | null>(
      baseRows.map((row) => [String(row.orderId), row.branchId ?? null]),
    );
    const orderById = new Map<string, OrderListRow>(
      baseRows.map((row) => [String(row.orderId), row]),
    );

    for (const row of itemRows ?? []) {
      const orderId = String(row.order_id);
      const branchId = branchIdByOrderId.get(orderId) ?? null;
      const recipeKey = branchId ? `${branchId}:${String(row.item_id)}` : "";
      const recipe = recipeKey ? recipeMap.get(recipeKey) ?? [] : [];
      const kitchenStatus = String(row.kitchen_status ?? "NEW").trim().toUpperCase() as OrderStatus;
      const current = itemsByTicketKey.get(`${orderId}:${kitchenStatus}`) ?? [];

      current.push({
        orderItemId: String(row.order_item_id),
        itemId: String(row.item_id),
        itemName: String(row.item_name ?? `#${row.item_id}`),
        quantity: toInt(row.quantity),
        itemOptions: normalizeJson(row.item_options),
        kitchenStatus,
        recipe,
        recipeConfigured: recipe.length > 0,
      });

      itemsByTicketKey.set(`${orderId}:${kitchenStatus}`, current);
    }

    const groupedRows: OrderListRow[] = [];

    for (const [ticketKey, items] of itemsByTicketKey.entries()) {
      const parts = ticketKey.split(":");
      const orderId = parts[0];
      const kitchenStatus = parts[1];
      if (!orderId || !kitchenStatus) continue;
      const order = orderById.get(orderId);
      if (!order) continue;

      groupedRows.push({
        ...order,
        ticketKey: `${order.orderCode}:${kitchenStatus}`,
        orderStatus: kitchenStatus as OrderStatus,
        items,
        totalItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueItemCount: items.length,
        recipeConfigured: items.length > 0 ? items.every((item) => item.recipeConfigured) : false,
      });
    }

    return groupedRows.sort((left, right) => {
      const updatedDiff =
        Date.parse(right.updatedAt ?? right.createdAt ?? "") - Date.parse(left.updatedAt ?? left.createdAt ?? "");
      if (updatedDiff !== 0) return updatedDiff;
      return String(right.ticketKey ?? "").localeCompare(String(left.ticketKey ?? ""));
    });
  }

  async listUnpaidOrders(input: {
    branchId?: string | null;
    limit: number;
  }): Promise<OrderListRow[]> {
    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 50))));

    const where: string[] = ["o.order_status NOT IN ('PAID','CANCELED')"]; // unpaid
    const params: any[] = [];

    if (input.branchId) {
      where.push("rt.branch_id = ?");
      params.push(String(input.branchId));
    }

    params.push(limit);

    const sql = `
      SELECT
        o.order_id,
        o.order_code,
        o.order_status,
        o.created_at,
        o.updated_at,
        o.note,
        o.subtotal_amount,
        o.discount_amount,
        o.total_amount,
        o.voucher_code_snapshot,
        o.voucher_name_snapshot,
        rt.branch_id,
        rt.table_code,
        s.opened_at AS session_opened_at
      FROM orders o
      LEFT JOIN table_sessions s ON s.session_id = o.session_id
      LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
      WHERE ${where.join(" AND ")}
      ORDER BY o.updated_at DESC, o.order_id DESC
      LIMIT ?
    `;

    const [rows]: any = await pool.query(sql, params);
    const baseRows: OrderListRow[] = (rows ?? []).map((r: any) => ({
      orderId: String(r.order_id),
      orderCode: String(r.order_code),
      orderStatus: String(r.order_status) as OrderStatus,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
      tableCode: r.table_code ? String(r.table_code) : null,
      sessionOpenedAt: toNullableIso(r.session_opened_at),
      subtotalAmount: Number(r.subtotal_amount ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
      totalAmount: Number(r.total_amount ?? 0),
      voucherCode: r.voucher_code_snapshot ? String(r.voucher_code_snapshot) : null,
      voucherName: r.voucher_name_snapshot ? String(r.voucher_name_snapshot) : null,
      orderNote: r.note ? String(r.note) : null,
    }));

    if (baseRows.length === 0) {
      return [];
    }

    const orderIds = baseRows
      .map((row) => String(row.orderId ?? "").trim())
      .filter(Boolean);
    const itemPlaceholders = orderIds.map(() => "?").join(",");

    const [itemRows]: any = await pool.query(
      `SELECT order_id, order_item_id, item_id, item_name, quantity, unit_price, line_total, item_options, pricing_breakdown
       FROM order_items
       WHERE order_id IN (${itemPlaceholders})
       ORDER BY order_id ASC, order_item_id ASC`,
      orderIds,
    );

    const itemsByOrderId = new Map<string, KitchenQueueItemRow[]>();

    for (const row of itemRows ?? []) {
      const orderId = String(row.order_id);
      const current = itemsByOrderId.get(orderId) ?? [];

      current.push({
        orderItemId: String(row.order_item_id),
        itemId: String(row.item_id),
        itemName: String(row.item_name ?? `#${row.item_id}`),
        quantity: toInt(row.quantity),
        itemOptions: normalizeJson(row.item_options),
        unitPrice: Number(row.unit_price ?? 0),
        lineTotal: Number(row.line_total ?? 0),
        pricingBreakdown: normalizeJson(row.pricing_breakdown),
      });

      itemsByOrderId.set(orderId, current);
    }

    return baseRows.map((row) => {
      const items = itemsByOrderId.get(String(row.orderId)) ?? [];
      return {
        ...row,
        items,
        totalItemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueItemCount: items.length,
      };
    });
  }
}
