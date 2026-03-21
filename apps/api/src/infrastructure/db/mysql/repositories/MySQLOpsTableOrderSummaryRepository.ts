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
    const activeStatusPh = ACTIVE_STATUSES.map(() => "?").join(",");

    const loadSummary = async (inputForKind: {
      countAlias: string;
      whereSql: string;
      params: Array<string>;
    }) => {
      const sql1 = `
        SELECT
          rt.table_id AS table_id,
          COUNT(*) AS ${inputForKind.countAlias},
          MAX(o.order_id) AS latest_order_id
        FROM orders o
        JOIN table_sessions s ON s.session_id = o.session_id
        JOIN restaurant_tables rt ON rt.table_id = s.table_id
        WHERE rt.branch_id = ?
          AND rt.table_id IN (${tablePh})
          AND o.order_channel = 'DINE_IN'
          AND ${inputForKind.whereSql}
        GROUP BY rt.table_id
      `;

      const [rows1]: any = await pool.query(sql1, [branchId, ...tableIds, ...inputForKind.params]);

      const byTable: Record<string, { count: number; latestOrderId: string }> = {};
      const latestOrderIds = new Set<string>();

      for (const r of rows1 ?? []) {
        const tid = String(r.table_id);
        const count = Number(r[inputForKind.countAlias] ?? 0);
        const oid = r.latest_order_id != null ? String(r.latest_order_id) : "";
        if (!tid) continue;
        byTable[tid] = { count, latestOrderId: oid };
        if (oid) latestOrderIds.add(oid);
      }

      const orderIds = [...latestOrderIds];
      if (orderIds.length === 0) {
        return {
          byTable,
          orderById: {} as Record<string, { code: string; status: OrderStatus; updatedAt: string }>,
          itemsByOrder: {} as Record<string, Array<{ name: string; qty: number }>>,
        };
      }

      const orderPh = orderIds.map(() => "?").join(",");
      const [rows2]: any = await pool.query(
        `SELECT order_id, order_code, order_status, updated_at
         FROM orders
         WHERE order_id IN (${orderPh})`,
        orderIds,
      );

      const orderById: Record<string, { code: string; status: OrderStatus; updatedAt: string }> = {};
      for (const r of rows2 ?? []) {
        const id = String(r.order_id);
        orderById[id] = {
          code: String(r.order_code),
          status: String(r.order_status) as OrderStatus,
          updatedAt: toIso(r.updated_at),
        };
      }

      const [rows3]: any = await pool.query(
        `SELECT order_id, item_name, SUM(quantity) AS qty
         FROM order_items
         WHERE order_id IN (${orderPh})
         GROUP BY order_id, item_name
         ORDER BY order_id ASC, qty DESC`,
        orderIds,
      );

      const itemsByOrder: Record<string, Array<{ name: string; qty: number }>> = {};
      for (const r of rows3 ?? []) {
        const oid = String(r.order_id);
        const name = String(r.item_name ?? "");
        const qty = Number(r.qty ?? 0);
        if (!oid || !name || !Number.isFinite(qty) || qty <= 0) continue;
        (itemsByOrder[oid] ??= []).push({ name, qty });
      }

      return { byTable, orderById, itemsByOrder };
    };

    const activeSummary = await loadSummary({
      countAlias: "matching_orders_count",
      whereSql: `o.order_status IN (${activeStatusPh})`,
      params: [...ACTIVE_STATUSES],
    });

    const unpaidSummary = await loadSummary({
      countAlias: "matching_orders_count",
      whereSql: `o.order_status NOT IN ('PAID', 'CANCELED')`,
      params: [],
    });

    const out: Record<string, OpsTableActiveSummary> = {};

    for (const tableId of tableIds) {
      const activeBase = activeSummary.byTable[tableId];
      const unpaidBase = unpaidSummary.byTable[tableId];

      const activeOrder = activeBase?.latestOrderId
        ? activeSummary.orderById[activeBase.latestOrderId] ?? null
        : null;
      const unpaidOrder = unpaidBase?.latestOrderId
        ? unpaidSummary.orderById[unpaidBase.latestOrderId] ?? null
        : null;

      const activeItems = activeBase?.latestOrderId
        ? activeSummary.itemsByOrder[activeBase.latestOrderId] ?? []
        : [];
      const unpaidItems = unpaidBase?.latestOrderId
        ? unpaidSummary.itemsByOrder[unpaidBase.latestOrderId] ?? []
        : [];

      const activeTop = activeItems.slice(0, 3);
      const unpaidTop = unpaidItems.slice(0, 3);

      const activeItemsCount = activeItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      const unpaidItemsCount = unpaidItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      out[tableId] = {
        tableId,
        activeOrdersCount: activeBase?.count ?? 0,
        activeOrderCode: activeOrder?.code ?? null,
        activeOrderStatus: activeOrder?.status ?? null,
        activeOrderUpdatedAt: activeOrder?.updatedAt ?? null,
        activeItemsCount: activeItemsCount || null,
        activeItemsTop: activeTop.length ? activeTop : null,
        activeItemsPreview: activeTop.length ? activeTop.map((item) => `${item.name} x${item.qty}`).join(", ") : null,
        unpaidOrdersCount: unpaidBase?.count ?? 0,
        unpaidOrderCode: unpaidOrder?.code ?? null,
        unpaidOrderStatus: unpaidOrder?.status ?? null,
        unpaidOrderUpdatedAt: unpaidOrder?.updatedAt ?? null,
        unpaidItemsCount: unpaidItemsCount || null,
        unpaidItemsTop: unpaidTop.length ? unpaidTop : null,
        unpaidItemsPreview: unpaidTop.length ? unpaidTop.map((item) => `${item.name} x${item.qty}`).join(", ") : null,
      };
    }

    return out;
  }
}
