import type {
  DashboardLowStockItem,
  DashboardMetricComparison,
  DashboardOverview,
  DashboardRecentActivity,
  DashboardRevenuePoint,
  DashboardTopItem,
  DashboardUpcomingReservation,
  IAdminDashboardRepository,
} from "../../../../application/ports/repositories/IAdminDashboardRepository.js";
import { pool } from "../connection.js";

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value as any).toISOString();
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateLabel(value: Date): string {
  return value.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function toBucketDateKey(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toDateKey(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  const isoLikeMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoLikeMatch) {
    return isoLikeMatch[1] ?? null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKey(parsed);
}

function compare(current: number, previous: number): DashboardMetricComparison {
  const delta = current - previous;
  const deltaPct =
    previous > 0
      ? Number((((current - previous) / previous) * 100).toFixed(1))
      : current > 0
        ? 100
        : null;

  return {
    current,
    previous,
    delta,
    deltaPct,
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

function buildSeries(orderRows: any[], revenueRows: any[]): DashboardRevenuePoint[] {
  const ordersByDate = new Map<string, number>();
  const revenueByDate = new Map<string, number>();

  for (const row of orderRows ?? []) {
    const date = toBucketDateKey(row.bucket);
    if (!date) continue;
    ordersByDate.set(date, toNumber(row.orders));
  }

  for (const row of revenueRows ?? []) {
    const date = toBucketDateKey(row.bucket);
    if (!date) continue;
    revenueByDate.set(date, toNumber(row.revenue));
  }

  const series: DashboardRevenuePoint[] = [];
  const today = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - offset);

    const date = toDateKey(cursor);
    series.push({
      date,
      label: toDateLabel(cursor),
      orders: ordersByDate.get(date) ?? 0,
      revenue: revenueByDate.get(date) ?? 0,
    });
  }

  return series;
}

function normalizeActivityType(value: unknown): DashboardRecentActivity["type"] {
  const normalized = String(value ?? "");
  if (normalized === "PAYMENT_SUCCESS") return "PAYMENT_SUCCESS";
  if (normalized === "ORDER_STATUS") return "ORDER_STATUS";
  return "INVENTORY_ADJUST";
}

function normalizeActivityTone(value: unknown): DashboardRecentActivity["tone"] {
  const normalized = String(value ?? "");
  if (normalized === "success") return "success";
  if (normalized === "warning") return "warning";
  return "neutral";
}

export class MySQLAdminDashboardRepository implements IAdminDashboardRepository {
  async getOverview(input: { branchId: string }): Promise<DashboardOverview> {
    const branchId = String(input.branchId);

    const [
      [summaryOrdersRows],
      [summaryRevenueRows],
      [activeTablesRows],
      [lowStockCountRows],
      [upcomingReservationCountRows],
      [seriesOrderRows],
      [seriesRevenueRows],
      [topItemRows],
      [lowStockRows],
      [upcomingReservationRows],
      [paymentActivityRows],
      [statusActivityRows],
      [inventoryActivityRows],
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() AND o.order_status <> 'CANCELED' THEN 1 ELSE 0 END), 0) AS ordersToday,
            COALESCE(SUM(CASE WHEN DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND o.order_status <> 'CANCELED' THEN 1 ELSE 0 END), 0) AS ordersYesterday,
            COALESCE(SUM(CASE WHEN o.order_status IN ('NEW', 'RECEIVED', 'PREPARING', 'READY') THEN 1 ELSE 0 END), 0) AS kitchenQueueCount,
            COALESCE(SUM(CASE WHEN o.order_status NOT IN ('PAID', 'CANCELED') THEN 1 ELSE 0 END), 0) AS unpaidOrderCount
          FROM orders o
          WHERE o.branch_id = ?
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            COALESCE(SUM(CASE WHEN DATE(p.updated_at) = CURDATE() THEN p.amount ELSE 0 END), 0) AS revenueToday,
            COALESCE(SUM(CASE WHEN DATE(p.updated_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN p.amount ELSE 0 END), 0) AS revenueYesterday
          FROM payments p
          JOIN orders o ON o.order_id = p.order_id
          WHERE o.branch_id = ?
            AND p.status = 'SUCCESS'
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT COUNT(DISTINCT s.table_id) AS activeTables
          FROM table_sessions s
          WHERE s.branch_id = ?
            AND s.status = 'OPEN'
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT COUNT(*) AS lowStockCount
          FROM inventory_items i
          WHERE i.branch_id = ?
            AND i.is_active = 1
            AND i.current_qty <= i.warning_threshold
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT COUNT(*) AS upcomingReservationCount
          FROM table_reservations r
          WHERE r.branch_id = ?
            AND r.status = 'CONFIRMED'
            AND r.reserved_from BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT DATE(o.created_at) AS bucket, COUNT(*) AS orders
          FROM orders o
          WHERE o.branch_id = ?
            AND o.order_status <> 'CANCELED'
            AND DATE(o.created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
          GROUP BY DATE(o.created_at)
          ORDER BY DATE(o.created_at) ASC
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT DATE(p.updated_at) AS bucket, COALESCE(SUM(p.amount), 0) AS revenue
          FROM payments p
          JOIN orders o ON o.order_id = p.order_id
          WHERE o.branch_id = ?
            AND p.status = 'SUCCESS'
            AND DATE(p.updated_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
          GROUP BY DATE(p.updated_at)
          ORDER BY DATE(p.updated_at) ASC
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            oi.item_id AS itemId,
            oi.item_name AS itemName,
            COALESCE(SUM(oi.quantity), 0) AS quantity,
            COUNT(DISTINCT oi.order_id) AS orders
          FROM order_items oi
          JOIN orders o ON o.order_id = oi.order_id
          WHERE o.branch_id = ?
            AND DATE(o.created_at) = CURDATE()
            AND o.order_status <> 'CANCELED'
          GROUP BY oi.item_id, oi.item_name
          ORDER BY quantity DESC, orders DESC, oi.item_name ASC
          LIMIT 5
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            i.id AS ingredientId,
            i.ingredient_code AS ingredientCode,
            i.ingredient_name AS ingredientName,
            i.unit AS unit,
            i.current_qty AS currentQty,
            i.warning_threshold AS warningThreshold,
            i.critical_threshold AS criticalThreshold,
            CASE
              WHEN i.current_qty <= i.critical_threshold THEN 'CRITICAL'
              ELSE 'WARNING'
            END AS alertLevel
          FROM inventory_items i
          WHERE i.branch_id = ?
            AND i.is_active = 1
            AND i.current_qty <= i.warning_threshold
          ORDER BY
            CASE WHEN i.current_qty <= i.critical_threshold THEN 0 ELSE 1 END ASC,
            i.current_qty ASC,
            i.ingredient_name ASC
          LIMIT 5
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            r.reservation_code AS reservationCode,
            r.table_code_snapshot AS tableCode,
            r.contact_name AS contactName,
            r.party_size AS partySize,
            r.status AS status,
            r.reserved_from AS reservedFrom
          FROM table_reservations r
          WHERE r.branch_id = ?
            AND r.status = 'CONFIRMED'
            AND r.reserved_from BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 4 HOUR)
          ORDER BY r.reserved_from ASC
          LIMIT 5
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            CONCAT('payment:', p.payment_id) AS id,
            'PAYMENT_SUCCESS' AS type,
            CONCAT('Thanh toán thành công • ', COALESCE(rt.table_code, o.order_code)) AS title,
            CONCAT(o.order_code, ' • ', COALESCE(rt.table_code, 'Mang đi')) AS subtitle,
            CONCAT(FORMAT(p.amount, 0), ' đ') AS badge,
            'success' AS tone,
            p.updated_at AS happenedAt
          FROM payments p
          JOIN orders o ON o.order_id = p.order_id
          LEFT JOIN table_sessions s ON s.session_id = o.session_id
          LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
          WHERE o.branch_id = ?
            AND p.status = 'SUCCESS'
          ORDER BY p.updated_at DESC
          LIMIT 5
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            CONCAT('status:', h.history_id) AS id,
            'ORDER_STATUS' AS type,
            CONCAT('Bếp cập nhật • ', o.order_code) AS title,
            CONCAT(COALESCE(rt.table_code, 'Không rõ bàn'), ' • ', h.to_status) AS subtitle,
            h.to_status AS badge,
            CASE
              WHEN h.to_status = 'READY' THEN 'success'
              WHEN h.to_status IN ('RECEIVED', 'PREPARING') THEN 'warning'
              ELSE 'neutral'
            END AS tone,
            h.changed_at AS happenedAt
          FROM order_status_history h
          JOIN orders o ON o.order_id = h.order_id
          LEFT JOIN table_sessions s ON s.session_id = o.session_id
          LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
          WHERE o.branch_id = ?
            AND h.changed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY h.changed_at DESC
          LIMIT 5
        `,
        [branchId],
      ),
      pool.query(
        `
          SELECT
            CONCAT('audit:', a.audit_id) AS id,
            'INVENTORY_ADJUST' AS type,
            CONCAT(
              'Điều chỉnh kho • ',
              COALESCE(mi.item_name, ii.ingredient_name, CONCAT('#', CAST(a.entity_id AS CHAR)))
            ) AS title,
            NULLIF(
              CONCAT(
                COALESCE(
                  JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.mode')),
                  JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.adjustmentType')),
                  'UPDATE'
                ),
                CASE
                  WHEN JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.reason')) IS NOT NULL
                  THEN CONCAT(' • ', JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.reason')))
                  ELSE ''
                END
              ),
              ''
            ) AS subtitle,
            COALESCE(
              JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.mode')),
              JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.adjustmentType')),
              'Kho'
            ) AS badge,
            'neutral' AS tone,
            a.created_at AS happenedAt
          FROM audit_logs a
          LEFT JOIN menu_items mi
            ON a.entity = 'menu_item_stock'
           AND mi.item_id = a.entity_id
          LEFT JOIN inventory_items ii
            ON a.entity = 'inventory_item'
           AND ii.id = a.entity_id
          WHERE JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.branchId')) = ?
            AND a.action IN ('inventory.adjust', 'inventory.ingredient.adjust')
          ORDER BY a.created_at DESC
          LIMIT 5
        `,
        [branchId],
      ),
    ]);

    const summaryOrders = (summaryOrdersRows as any[])?.[0] ?? {};
    const summaryRevenue = (summaryRevenueRows as any[])?.[0] ?? {};
    const activeTables = toNumber((activeTablesRows as any[])?.[0]?.activeTables);
    const lowStockCount = toNumber((lowStockCountRows as any[])?.[0]?.lowStockCount);
    const upcomingReservationCount = toNumber((upcomingReservationCountRows as any[])?.[0]?.upcomingReservationCount);

    const revenueSeries = buildSeries(seriesOrderRows as any[], seriesRevenueRows as any[]);

    const topItemsToday: DashboardTopItem[] = ((topItemRows as any[]) ?? []).map((row) => ({
      itemId: String(row.itemId),
      itemName: String(row.itemName ?? `#${row.itemId}`),
      quantity: toNumber(row.quantity),
      orders: toNumber(row.orders),
    }));

    const lowStockItems: DashboardLowStockItem[] = ((lowStockRows as any[]) ?? []).map((row) => ({
      ingredientId: String(row.ingredientId),
      ingredientCode: String(row.ingredientCode ?? ""),
      ingredientName: String(row.ingredientName ?? `#${row.ingredientId}`),
      unit: String(row.unit ?? ""),
      currentQty: toNumber(row.currentQty),
      warningThreshold: toNumber(row.warningThreshold),
      criticalThreshold: toNumber(row.criticalThreshold),
      alertLevel: String(row.alertLevel) === "CRITICAL" ? "CRITICAL" : "WARNING",
    }));

    const upcomingReservations: DashboardUpcomingReservation[] = ((upcomingReservationRows as any[]) ?? []).map((row) => ({
      reservationCode: String(row.reservationCode),
      tableCode: row.tableCode == null ? null : String(row.tableCode),
      contactName: row.contactName == null ? null : String(row.contactName),
      partySize: toNumber(row.partySize),
      status: String(row.status ?? "CONFIRMED"),
      reservedFrom: toIso(row.reservedFrom),
    }));

    const recentActivity: DashboardRecentActivity[] = [
      ...((paymentActivityRows as any[]) ?? []),
      ...((statusActivityRows as any[]) ?? []),
      ...((inventoryActivityRows as any[]) ?? []),
    ]
      .map((row) => ({
        id: String(row.id),
        type: normalizeActivityType(row.type),
        title: String(row.title ?? ""),
        subtitle: row.subtitle == null ? null : String(row.subtitle),
        badge: row.badge == null ? null : String(row.badge),
        tone: normalizeActivityTone(row.tone),
        at: toIso(row.happenedAt),
      }))
      .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
      .slice(0, 8);

    return {
      branchId,
      generatedAt: new Date().toISOString(),
      summary: {
        ordersToday: compare(toNumber(summaryOrders.ordersToday), toNumber(summaryOrders.ordersYesterday)),
        revenueToday: compare(toNumber(summaryRevenue.revenueToday), toNumber(summaryRevenue.revenueYesterday)),
        activeTables,
        lowStockCount,
        kitchenQueueCount: toNumber(summaryOrders.kitchenQueueCount),
        unpaidOrderCount: toNumber(summaryOrders.unpaidOrderCount),
        upcomingReservationCount,
      },
      revenueSeries,
      topItemsToday,
      lowStockItems,
      upcomingReservations,
      recentActivity,
    };
  }
}
