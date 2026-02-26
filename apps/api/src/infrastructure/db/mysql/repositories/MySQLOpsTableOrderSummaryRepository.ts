import type {
  IOpsTableOrderSummaryRepository,
  OpsTableActiveSummary,
} from "../../../../application/ports/repositories/IOpsTableOrderSummaryRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";

const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "RECEIVED", "PREPARING", "READY", "SERVING"];

function toIso(v: any): string {
  try {
    return new Date(v).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export class MySQLOpsTableOrderSummaryRepository implements IOpsTableOrderSummaryRepository {
  async getActiveSummaryByTableIds(input: {
    branchId: string;
    tableIds: string[];
  }): Promise<Record<string, OpsTableActiveSummary>> {
    const branchId = String(input.branchId ?? "");
    const tableIds = (input.tableIds ?? []).map(String).filter(Boolean);

    if (!branchId || tableIds.length === 0) return {};

    const tablePh = tableIds.map(() => "?").join(",");
    const statusPh = ACTIVE_STATUSES.map(() => "?").join(",");

    // 1) active count + latest active order_id per table
    const sql1 = `
      SELECT
        rt.table_id AS table_id,
        COUNT(*) AS active_orders_count,
        MAX(o.order_id) AS latest_order_id
      FROM orders o
      JOIN table_sessions s ON s.session_id = o.session_id
      JOIN restaurant_tables rt ON rt.table_id = s.table_id
      WHERE rt.branch_id = ?
        AND rt.table_id IN (${tablePh})
        AND o.order_channel = 'DINE_IN'
        AND o.order_status IN (${statusPh})
      GROUP BY rt.table_id
    `;

    const [rows1]: any = await pool.query(sql1, [branchId, ...tableIds, ...ACTIVE_STATUSES]);

    const byTable: Record<string, { count: number; latestOrderId: string }> = {};
    const latestOrderIds: string[] = [];

    for (const r of rows1 ?? []) {
      const tid = String(r.table_id);
      const count = Number(r.active_orders_count ?? 0);
      const oid = r.latest_order_id != null ? String(r.latest_order_id) : "";
      if (!tid) continue;
      byTable[tid] = { count, latestOrderId: oid };
      if (oid) latestOrderIds.push(oid);
    }

    if (latestOrderIds.length === 0) return {};

    const orderPh = latestOrderIds.map(() => "?").join(",");

    // 2) latest order detail
    const sql2 = `
      SELECT order_id, order_code, order_status, updated_at
      FROM orders
      WHERE order_id IN (${orderPh})
    `;
    const [rows2]: any = await pool.query(sql2, latestOrderIds);

    const orderById: Record<string, { code: string; status: OrderStatus; updatedAt: string }> = {};
    for (const r of rows2 ?? []) {
      const id = String(r.order_id);
      orderById[id] = {
        code: String(r.order_code),
        status: String(r.order_status) as OrderStatus,
        updatedAt: toIso(r.updated_at),
      };
    }

    // 3) items aggregate for those latest orders
    const sql3 = `
      SELECT order_id, item_name, SUM(quantity) AS qty
      FROM order_items
      WHERE order_id IN (${orderPh})
      GROUP BY order_id, item_name
      ORDER BY order_id ASC, qty DESC
    `;
    const [rows3]: any = await pool.query(sql3, latestOrderIds);

    const itemsByOrder: Record<string, Array<{ name: string; qty: number }>> = {};
    for (const r of rows3 ?? []) {
      const oid = String(r.order_id);
      const name = String(r.item_name ?? "");
      const qty = Number(r.qty ?? 0);
      if (!oid || !name || !Number.isFinite(qty) || qty <= 0) continue;
      (itemsByOrder[oid] ??= []).push({ name, qty });
    }

    // Build result by tableId
    const out: Record<string, OpsTableActiveSummary> = {};

    for (const [tableId, base] of Object.entries(byTable)) {
      const order = base.latestOrderId ? orderById[base.latestOrderId] : null;
      const items = base.latestOrderId ? (itemsByOrder[base.latestOrderId] ?? []) : [];

      const top = items.slice(0, 3);
      const itemsCount = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      const preview = top.length ? top.map((it) => `${it.name} x${it.qty}`).join(", ") : null;

      out[tableId] = {
        tableId,
        activeOrdersCount: base.count,
        activeOrderCode: order ? order.code : null,
        activeOrderStatus: order ? order.status : null,
        activeOrderUpdatedAt: order ? order.updatedAt : null,
        activeItemsCount: itemsCount || null,
        activeItemsTop: top.length ? top : null,
        activeItemsPreview: preview,
      };
    }

    return out;
  }
}