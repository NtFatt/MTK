import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type DashboardMetricComparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
  trend: "up" | "down" | "flat";
};

export type DashboardSummary = {
  ordersToday: DashboardMetricComparison;
  revenueToday: DashboardMetricComparison;
  activeTables: number;
  lowStockCount: number;
  kitchenQueueCount: number;
  unpaidOrderCount: number;
  upcomingReservationCount: number;
};

export type DashboardRevenuePoint = {
  date: string;
  label: string;
  orders: number;
  revenue: number;
};

export type DashboardTopItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  orders: number;
};

export type DashboardLowStockItem = {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  currentQty: number;
  warningThreshold: number;
  criticalThreshold: number;
  alertLevel: "WARNING" | "CRITICAL";
};

export type DashboardUpcomingReservation = {
  reservationCode: string;
  tableCode: string | null;
  contactName: string | null;
  partySize: number;
  status: string;
  reservedFrom: string;
};

export type DashboardRecentActivity = {
  id: string;
  type: "PAYMENT_SUCCESS" | "ORDER_STATUS" | "INVENTORY_ADJUST";
  title: string;
  subtitle: string | null;
  badge: string | null;
  tone: "success" | "warning" | "neutral";
  at: string;
};

export type DashboardOverview = {
  branchId: string;
  generatedAt: string;
  summary: DashboardSummary;
  revenueSeries: DashboardRevenuePoint[];
  topItemsToday: DashboardTopItem[];
  lowStockItems: DashboardLowStockItem[];
  upcomingReservations: DashboardUpcomingReservation[];
  recentActivity: DashboardRecentActivity[];
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMetric(raw: any): DashboardMetricComparison {
  return {
    current: toNumber(raw?.current),
    previous: toNumber(raw?.previous),
    delta: toNumber(raw?.delta),
    deltaPct: raw?.deltaPct == null ? null : toNumber(raw.deltaPct),
    trend:
      raw?.trend === "up"
        ? "up"
        : raw?.trend === "down"
          ? "down"
          : "flat",
  };
}

export async function fetchDashboardOverview(branchId: string): Promise<DashboardOverview> {
  const qs = new URLSearchParams();
  qs.set("branchId", branchId);

  const raw = await apiFetchAuthed<any>(`/admin/dashboard/overview?${qs.toString()}`);
  return {
    branchId: String(raw?.branchId ?? branchId),
    generatedAt: String(raw?.generatedAt ?? new Date().toISOString()),
    summary: {
      ordersToday: normalizeMetric(raw?.summary?.ordersToday),
      revenueToday: normalizeMetric(raw?.summary?.revenueToday),
      activeTables: toNumber(raw?.summary?.activeTables),
      lowStockCount: toNumber(raw?.summary?.lowStockCount),
      kitchenQueueCount: toNumber(raw?.summary?.kitchenQueueCount),
      unpaidOrderCount: toNumber(raw?.summary?.unpaidOrderCount),
      upcomingReservationCount: toNumber(raw?.summary?.upcomingReservationCount),
    },
    revenueSeries: Array.isArray(raw?.revenueSeries)
      ? raw.revenueSeries.map((item: any) => ({
          date: String(item?.date ?? ""),
          label: String(item?.label ?? ""),
          orders: toNumber(item?.orders),
          revenue: toNumber(item?.revenue),
        }))
      : [],
    topItemsToday: Array.isArray(raw?.topItemsToday)
      ? raw.topItemsToday.map((item: any) => ({
          itemId: String(item?.itemId ?? ""),
          itemName: String(item?.itemName ?? ""),
          quantity: toNumber(item?.quantity),
          orders: toNumber(item?.orders),
        }))
      : [],
    lowStockItems: Array.isArray(raw?.lowStockItems)
      ? raw.lowStockItems.map((item: any) => ({
          ingredientId: String(item?.ingredientId ?? ""),
          ingredientCode: String(item?.ingredientCode ?? ""),
          ingredientName: String(item?.ingredientName ?? ""),
          unit: String(item?.unit ?? ""),
          currentQty: toNumber(item?.currentQty),
          warningThreshold: toNumber(item?.warningThreshold),
          criticalThreshold: toNumber(item?.criticalThreshold),
          alertLevel: item?.alertLevel === "CRITICAL" ? "CRITICAL" : "WARNING",
        }))
      : [],
    upcomingReservations: Array.isArray(raw?.upcomingReservations)
      ? raw.upcomingReservations.map((item: any) => ({
          reservationCode: String(item?.reservationCode ?? ""),
          tableCode: item?.tableCode == null ? null : String(item.tableCode),
          contactName: item?.contactName == null ? null : String(item.contactName),
          partySize: toNumber(item?.partySize),
          status: String(item?.status ?? ""),
          reservedFrom: String(item?.reservedFrom ?? ""),
        }))
      : [],
    recentActivity: Array.isArray(raw?.recentActivity)
      ? raw.recentActivity.map((item: any) => ({
          id: String(item?.id ?? ""),
          type:
            item?.type === "PAYMENT_SUCCESS"
              ? "PAYMENT_SUCCESS"
              : item?.type === "ORDER_STATUS"
                ? "ORDER_STATUS"
                : "INVENTORY_ADJUST",
          title: String(item?.title ?? ""),
          subtitle: item?.subtitle == null ? null : String(item.subtitle),
          badge: item?.badge == null ? null : String(item.badge),
          tone:
            item?.tone === "success"
              ? "success"
              : item?.tone === "warning"
                ? "warning"
                : "neutral",
          at: String(item?.at ?? ""),
        }))
      : [],
  };
}
