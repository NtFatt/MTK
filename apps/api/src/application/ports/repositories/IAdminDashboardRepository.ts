export type DashboardMetricTrend = "up" | "down" | "flat";

export type DashboardMetricComparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
  trend: DashboardMetricTrend;
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

export interface IAdminDashboardRepository {
  getOverview(input: { branchId: string }): Promise<DashboardOverview>;
}
