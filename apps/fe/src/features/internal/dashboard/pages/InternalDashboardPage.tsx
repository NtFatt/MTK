import { useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { useParams } from "react-router-dom";
import { subscribeRealtime, type EventEnvelope, useRealtimeRoom } from "../../../../shared/realtime";
import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { useDashboardOverviewQuery } from "../hooks/useDashboardOverviewQuery";
import type {
  DashboardLowStockItem,
  DashboardMetricComparison,
  DashboardRecentActivity,
  DashboardRevenuePoint,
  DashboardSummary,
  DashboardTopItem,
  DashboardUpcomingReservation,
} from "../services/dashboardApi";

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return String(value);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function trendText(metric: DashboardMetricComparison): string {
  if (metric.deltaPct == null) {
    if (metric.delta === 0) return "Ổn định so với hôm qua";
    return metric.delta > 0 ? "Phát sinh mới so với hôm qua" : "Đã giảm về 0";
  }

  const sign = metric.deltaPct > 0 ? "+" : "";
  return `${sign}${metric.deltaPct}% so với hôm qua`;
}

function trendTone(metric: DashboardMetricComparison): string {
  if (metric.trend === "up") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (metric.trend === "down") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  return "bg-[#fff8ef] text-[#876341] ring-1 ring-[#ead7bb]";
}

function activityTone(tone: DashboardRecentActivity["tone"]): string {
  if (tone === "success") return "bg-[#1c7c44]";
  if (tone === "warning") return "bg-[#c7841f]";
  return "bg-[#b58a62]";
}

function activityBadgeTone(tone: DashboardRecentActivity["tone"]): string {
  if (tone === "success") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (tone === "warning") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-[#fff8ef] text-[#876341] ring-1 ring-[#ead7bb]";
}

function resourceBadgeTone(level: DashboardLowStockItem["alertLevel"]): string {
  return level === "CRITICAL"
    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
}

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const prefixes = ["branch:", "ops:", "kitchen:", "cashier:", "inventory:"];
  for (const prefix of prefixes) {
    if (env.room.startsWith(prefix)) {
      const value = env.room.slice(prefix.length).trim();
      return value || null;
    }
  }

  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;
  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;

  const raw = scope?.branchId ?? scope?.branch_id ?? payload?.branchId ?? payload?.branch_id;
  return raw != null && String(raw).trim() ? String(raw).trim() : null;
}

function isDashboardRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;
  if (env.type === "realtime.gap") {
    return env.room === `branch:${branchId}` ||
      env.room === `ops:${branchId}` ||
      env.room === `kitchen:${branchId}` ||
      env.room === `cashier:${branchId}` ||
      env.room === `inventory:${branchId}`;
  }

  const branchFromEvent = extractBranchIdFromRealtime(env);
  if (branchFromEvent !== branchId) return false;

  return (
    env.type.startsWith("order.") ||
    env.type.startsWith("payment.") ||
    env.type.startsWith("table.session.") ||
    env.type.startsWith("inventory.") ||
    env.type.startsWith("reservation.")
  );
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const cp1x = prev.x + (current.x - prev.x) / 2;
    const cp2x = cp1x;
    path += ` C ${cp1x} ${prev.y}, ${cp2x} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baseY: number): string {
  if (!points.length) return "";
  return `${buildSmoothPath(points)} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
}

function DashboardHero({
  generatedAt,
  isFetching,
  onRefresh,
}: {
  generatedAt: string | null | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#ead8c0] bg-[linear-gradient(135deg,#fffdf9_0%,#fff6ec_58%,#fff1e3_100%)] px-7 py-7 shadow-[0_28px_80px_-48px_rgba(60,29,9,0.28)]">
      <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,#f6ddba_0%,rgba(246,221,186,0)_72%)]" />
      <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,#fdebd8_0%,rgba(253,235,216,0)_72%)]" />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#fff4e6] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[#9f7751] ring-1 ring-[#ecd2ad]">
            <span className="h-2 w-2 rounded-full bg-[#cf5b42]" />
            Operations Overview
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[#4e2916] md:text-[2.1rem]">
              Bức tranh vận hành cho chi nhánh
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-[#7a5a43] md:text-[15px]">
              Theo dõi nhịp tạo đơn, doanh thu đã thu, bàn đang hoạt động, queue bếp, thu ngân, kho và reservation
              trên một mặt phẳng rõ ràng hơn, thay vì phải ghép tín hiệu từ nhiều module rời.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-[#ead7bb] bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a18366]">Làm mới gần nhất</div>
            <div className="mt-1 text-sm font-semibold text-[#4e2916]">{formatDateTime(generatedAt)}</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#ead7bb] bg-white/90 px-4 py-3 shadow-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${isFetching ? "bg-[#c7841f]" : "bg-[#1c7c44]"}`} />
            <span className="text-sm font-medium text-[#7a5a43]">{isFetching ? "Đang đồng bộ..." : "Live data"}</span>
          </div>
          <Button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="rounded-2xl bg-[#cf5b42] px-5 text-white shadow-[0_18px_38px_-24px_rgba(185,64,49,0.75)] hover:bg-[#b94031]"
          >
            {isFetching ? "Đang làm mới..." : "Refresh"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function PrimaryMetricCard({
  title,
  value,
  helper,
  trend,
  accent,
}: {
  title: string;
  value: string;
  helper: string;
  trend?: DashboardMetricComparison;
  accent: string;
}) {
  return (
    <article className="rounded-[28px] border border-[#ead8c0] bg-white/95 p-5 shadow-[0_22px_60px_-40px_rgba(60,29,9,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#a18366]">{title}</div>
          <div className="text-[2rem] font-semibold tracking-tight text-[#4e2916]">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${accent} shadow-inner`} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#7a5a43]">{helper}</div>
        {trend ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${trendTone(trend)}`}>{trendText(trend)}</span>
        ) : null}
      </div>
    </article>
  );
}

function AnalyticsCard({
  series,
  chartTotals,
  summary,
}: {
  series: DashboardRevenuePoint[];
  chartTotals: { orders: number; revenue: number };
  summary: DashboardSummary;
}) {
  const width = 760;
  const height = 312;
  const padding = { top: 26, right: 24, bottom: 48, left: 18 };
  const baseY = height - padding.bottom;
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...series.map((point) => point.revenue), 1);
  const maxOrders = Math.max(...series.map((point) => point.orders), 1);
  const step = series.length > 1 ? usableWidth / (series.length - 1) : usableWidth;

  const points = series.map((point, index) => {
    const x = padding.left + step * index;
    const revenueY = baseY - (point.revenue / maxRevenue) * usableHeight;
    const ordersY = baseY - (point.orders / maxOrders) * usableHeight * 0.82;
    return { ...point, x, revenueY, ordersY };
  });

  const revenuePath = buildSmoothPath(points.map((point) => ({ x: point.x, y: point.revenueY })));
  const revenueAreaPath = buildAreaPath(points.map((point) => ({ x: point.x, y: point.revenueY })), baseY);
  const ordersPath = buildSmoothPath(points.map((point) => ({ x: point.x, y: point.ordersY })));
  const latest = points[points.length - 1];
  const latestCardX = latest ? Math.max(18, Math.min(latest.x - 72, width - 150)) : 18;
  const latestCardY = latest ? Math.max(18, latest.revenueY - 88) : 18;

  return (
    <section className="rounded-[32px] border border-[#ead8c0] bg-white/95 p-6 shadow-[0_24px_72px_-42px_rgba(60,29,9,0.22)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex rounded-full bg-[#fff4e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9f7751] ring-1 ring-[#ecd2ad]">
            Sales Report
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#4e2916]">Nhịp đơn hàng và doanh thu 7 ngày</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7a5a43]">
              Mạch biểu đồ gộp cả doanh thu đã thu lẫn số đơn tạo mới để nhìn ra ngày nào chi nhánh tăng nhiệt nhanh nhất.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf4] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#a18366]">Tổng 7 ngày</div>
            <div className="mt-1 text-lg font-semibold text-[#4e2916]">{formatVnd(chartTotals.revenue)}</div>
            <div className="mt-1 text-sm text-[#7a5a43]">{chartTotals.orders} đơn đã tạo</div>
          </div>
          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf4] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#a18366]">Hôm nay</div>
            <div className="mt-1 text-lg font-semibold text-[#4e2916]">{formatVnd(summary.revenueToday.current)}</div>
            <div className="mt-1 text-sm text-[#7a5a43]">{summary.ordersToday.current} đơn đã ghi nhận</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#7a5a43]">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#cf5b42]" />
          Doanh thu đã thu
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-[3px] w-5 rounded-full bg-[#8f6a46]" />
          Số đơn tạo mới
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-[28px] border border-[#ead7bb] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
          <defs>
            <linearGradient id="dashboardAreaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d96850" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#d96850" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="dashboardLineGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#d96850" />
              <stop offset="100%" stopColor="#b94031" />
            </linearGradient>
          </defs>

          {Array.from({ length: 4 }).map((_, index) => {
            const y = padding.top + (usableHeight / 3) * index;
            return (
              <line
                key={y}
                x1={String(padding.left)}
                x2={String(width - padding.right)}
                y1={String(y)}
                y2={String(y)}
                stroke="#eddcc6"
                strokeDasharray="6 8"
              />
            );
          })}

          {revenueAreaPath ? <path d={revenueAreaPath} fill="url(#dashboardAreaFill)" /> : null}
          {revenuePath ? (
            <path
              d={revenuePath}
              fill="none"
              stroke="url(#dashboardLineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {ordersPath ? (
            <path
              d={ordersPath}
              fill="none"
              stroke="#8f6a46"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 0"
            />
          ) : null}

          {points.map((point) => (
            <g key={point.date}>
              <circle cx={String(point.x)} cy={String(point.revenueY)} r="5.5" fill="#ffffff" stroke="#cf5b42" strokeWidth="3" />
              <circle cx={String(point.x)} cy={String(point.ordersY)} r="4.2" fill="#ffffff" stroke="#8f6a46" strokeWidth="2.5" />
              <text x={String(point.x)} y={String(baseY + 28)} textAnchor="middle" fontSize="12" fill="#8a684d">
                {point.label}
              </text>
              <text x={String(point.x)} y={String(point.ordersY - 12)} textAnchor="middle" fontSize="12" fill="#8a684d">
                {point.orders}
              </text>
            </g>
          ))}

          {latest ? (
            <g transform={`translate(${latestCardX}, ${latestCardY})`}>
              <rect width="132" height="58" rx="18" fill="#ffffff" stroke="#ead7bb" />
              <text x="16" y="22" fontSize="11" fill="#8a684d">
                {latest.label}
              </text>
              <text x="16" y="40" fontSize="16" fontWeight="700" fill="#4e2916">
                {formatCompactNumber(latest.revenue)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </section>
  );
}

function OperationsPulseCard({ summary }: { summary: DashboardSummary }) {
  const signals = [
    {
      label: "Bếp đang chờ",
      value: summary.kitchenQueueCount,
      helper: "ticket chưa hoàn tất",
      color: "from-[#cf5b42] to-[#b94031]",
    },
    {
      label: "Bill chưa thanh toán",
      value: summary.unpaidOrderCount,
      helper: "cần cashier xử lý",
      color: "from-[#d8a85b] to-[#b8832f]",
    },
    {
      label: "Reservation sắp tới",
      value: summary.upcomingReservationCount,
      helper: "trong vài giờ tới",
      color: "from-[#d8a85b] to-[#cf5b42]",
    },
    {
      label: "Kho sắp chạm ngưỡng",
      value: summary.lowStockCount,
      helper: "cần inventory theo dõi",
      color: "from-[#d96850] to-[#c7841f]",
    },
  ];

  const maxSignal = Math.max(...signals.map((item) => item.value), 1);
  const pressure = signals.reduce((acc, item) => acc + item.value, 0);

  return (
    <section className="rounded-[32px] border border-[#ead8c0] bg-white/95 p-6 shadow-[0_24px_72px_-42px_rgba(60,29,9,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full bg-[#fff4e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9f7751] ring-1 ring-[#ecd2ad]">
            Branch Pulse
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[#4e2916]">Áp lực vận hành hiện tại</h2>
          <p className="mt-1 text-sm leading-6 text-[#7a5a43]">
            Nhìn nhanh xem bếp, cashier, reservation và tồn kho đang yên hay bắt đầu dồn việc.
          </p>
        </div>

        <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf4] px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#a18366]">Pressure score</div>
          <div className="mt-1 text-2xl font-semibold text-[#4e2916]">{pressure}</div>
          <div className="mt-1 text-sm text-[#7a5a43]">{pressure === 0 ? "Êm" : pressure <= 3 ? "Có nhịp nhẹ" : "Cần chú ý"}</div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {signals.map((signal) => {
          const width = `${Math.max(12, (signal.value / maxSignal) * 100)}%`;
          return (
            <div key={signal.label} className="rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#4e2916]">{signal.label}</div>
                  <div className="mt-1 text-sm text-[#7a5a43]">{signal.helper}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-[#4e2916]">{signal.value}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Live</div>
                </div>
              </div>

              <div className="mt-4 h-2.5 rounded-full bg-[#f4e6d3]">
                <div className={`h-2.5 rounded-full bg-gradient-to-r ${signal.color}`} style={{ width }} />
              </div>
            </div>
          );
        })}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#a18366]">Bàn đang hoạt động</div>
            <div className="mt-2 text-3xl font-semibold text-[#4e2916]">{summary.activeTables}</div>
            <div className="mt-1 text-sm text-[#7a5a43]">bàn có session mở</div>
          </div>
          <div className="rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#a18366]">Doanh thu hôm nay</div>
            <div className="mt-2 text-3xl font-semibold text-[#4e2916]">{formatCompactNumber(summary.revenueToday.current)}</div>
            <div className="mt-1 text-sm text-[#7a5a43]">{summary.ordersToday.current} đơn đã tạo</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopItemsCard({ items }: { items: DashboardTopItem[] }) {
  const maxQuantity = Math.max(...items.map((item) => item.quantity), 1);

  return (
    <section className="rounded-[32px] border border-[#ead8c0] bg-white/95 p-6 shadow-[0_24px_72px_-42px_rgba(60,29,9,0.22)]">
      <div>
        <div className="inline-flex rounded-full bg-[#fff4e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9f7751] ring-1 ring-[#ecd2ad]">
          Best Sellers
        </div>
        <h2 className="mt-3 text-xl font-semibold text-[#4e2916]">Món được gọi nhiều</h2>
        <p className="mt-1 text-sm leading-6 text-[#7a5a43]">
          Top món hôm nay để quản lý nhìn ra xu hướng gọi món ngay trong ca.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#ead7bb] bg-[#fffaf4] px-4 py-5 text-sm text-[#7a5a43]">
            Hôm nay chưa có đủ dữ liệu gọi món để xếp hạng.
          </div>
        ) : (
          items.map((item, index) => {
            const width = `${Math.max(18, (item.quantity / maxQuantity) * 100)}%`;
            return (
              <div key={item.itemId || `${item.itemName}-${index}`} className="rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#a18366]">Top {index + 1}</div>
                    <div className="mt-1 truncate text-base font-semibold text-[#4e2916]">{item.itemName}</div>
                    <div className="mt-1 text-sm text-[#7a5a43]">{item.orders} bill có món này</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-[#4e2916]">{item.quantity}</div>
                    <div className="text-sm text-[#7a5a43]">phần</div>
                  </div>
                </div>

                <div className="mt-4 h-2.5 rounded-full bg-[#f4e6d3]">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-[#cf5b42] to-[#d8a85b]" style={{ width }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function RecentActivityCard({ items }: { items: DashboardRecentActivity[] }) {
  return (
    <section className="rounded-[32px] border border-[#ead8c0] bg-white/95 p-6 shadow-[0_24px_72px_-42px_rgba(60,29,9,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full bg-[#fff4e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9f7751] ring-1 ring-[#ecd2ad]">
            Activity Feed
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[#4e2916]">Hoạt động gần đây</h2>
          <p className="mt-1 text-sm leading-6 text-[#7a5a43]">
            Timeline gọn hơn để nhìn ra thanh toán, cập nhật bếp và biến động vận hành mới nhất.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#ead7bb] bg-[#fffaf4] px-4 py-5 text-sm text-[#7a5a43]">
            Chưa có sự kiện vận hành đủ mới để hiển thị.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start gap-4 rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4"
            >
              <span className={`mt-1.5 h-3 w-3 rounded-full ${activityTone(item.tone)}`} />

              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-base font-semibold text-[#4e2916]">{item.title}</div>
                {item.subtitle ? <div className="text-sm text-[#7a5a43]">{item.subtitle}</div> : null}
                <div className="text-sm text-[#a18366]">{formatDateTime(item.at)}</div>
              </div>

              {item.badge ? (
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${activityBadgeTone(item.tone)}`}>
                  {item.badge}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function WatchlistCard({
  lowStockItems,
  upcomingReservations,
}: {
  lowStockItems: DashboardLowStockItem[];
  upcomingReservations: DashboardUpcomingReservation[];
}) {
  return (
    <section className="rounded-[32px] border border-[#ead8c0] bg-white/95 p-6 shadow-[0_24px_72px_-42px_rgba(60,29,9,0.22)]">
      <div>
        <div className="inline-flex rounded-full bg-[#fff8ec] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#876341] ring-1 ring-[#ead7bb]">
          Watchlist
        </div>
        <h2 className="mt-3 text-xl font-semibold text-[#4e2916]">Điểm cần theo dõi</h2>
        <p className="mt-1 text-sm leading-6 text-[#7a5a43]">
          Gom kho sắp chạm ngưỡng và reservation sắp tới vào một panel để không bỏ sót tín hiệu nhỏ.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7a5a43]">Kho sắp hết</h3>
            <span className="text-sm font-medium text-[#a18366]">{lowStockItems.length}</span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#ead7bb] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
              Hiện chưa có nguyên liệu nào chạm ngưỡng cảnh báo.
            </div>
          ) : (
            lowStockItems.slice(0, 3).map((item) => (
              <div key={item.ingredientId} className="rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-[#4e2916]">{item.ingredientName}</div>
                    <div className="mt-1 text-sm text-[#7a5a43]">
                      {item.currentQty} {item.unit} còn lại • cảnh báo {item.warningThreshold} {item.unit}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${resourceBadgeTone(item.alertLevel)}`}>
                    {item.alertLevel}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7a5a43]">Reservation sắp tới</h3>
            <span className="text-sm font-medium text-[#a18366]">{upcomingReservations.length}</span>
          </div>

          {upcomingReservations.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#ead7bb] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
              Không có reservation confirmed nào trong vài giờ tới.
            </div>
          ) : (
            upcomingReservations.slice(0, 3).map((item) => (
              <div key={item.reservationCode} className="rounded-[24px] border border-[#ead7bb] bg-[#fffaf4] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-[#4e2916]">{item.reservationCode}</div>
                    <div className="mt-1 text-sm text-[#7a5a43]">
                      {item.tableCode ? `Bàn ${item.tableCode}` : "Chưa gắn bàn"} • {item.partySize} khách
                    </div>
                    {item.contactName ? <div className="mt-1 text-sm text-[#7a5a43]">{item.contactName}</div> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fff4e6] px-3 py-1 text-xs font-semibold text-[#9f7751] ring-1 ring-[#ecd2ad]">
                    {formatDateTime(item.reservedFrom)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-[204px] animate-pulse rounded-[32px] bg-[#fff7ee]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[160px] animate-pulse rounded-[28px] bg-[#fff7ee]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
        <div className="h-[520px] animate-pulse rounded-[32px] bg-[#fff7ee]" />
        <div className="h-[520px] animate-pulse rounded-[32px] bg-[#fff7ee]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)_minmax(320px,0.9fr)]">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[420px] animate-pulse rounded-[32px] bg-[#fff7ee]" />
        ))}
      </div>
    </div>
  );
}

export function InternalDashboardPage() {
  const session = useStore(authStore, (state) => state.session);
  const { branchId: branchParam } = useParams<{ branchId: string }>();
  const branchId = String(branchParam ?? session?.branchId ?? "1");
  const enabled = Boolean(session && branchId);

  useRealtimeRoom(
    enabled ? `branch:${branchId}` : null,
    enabled,
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId,
          token: session.accessToken,
        }
      : undefined,
  );
  useRealtimeRoom(enabled ? `ops:${branchId}` : null, enabled);
  useRealtimeRoom(enabled ? `kitchen:${branchId}` : null, enabled);
  useRealtimeRoom(enabled ? `cashier:${branchId}` : null, enabled);
  useRealtimeRoom(enabled ? `inventory:${branchId}` : null, enabled);

  const { data, error, isFetching, isLoading, refetch } = useDashboardOverviewQuery(branchId, enabled);

  useEffect(() => {
    if (!enabled) return undefined;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeRealtime((env) => {
      if (!isDashboardRealtimeEvent(env, branchId)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refetch();
      }, 90);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, branchId, refetch]);

  const summary = data?.summary;

  const chartTotals = useMemo(() => {
    const source = data?.revenueSeries ?? [];
    return source.reduce(
      (acc, point) => {
        acc.orders += point.orders;
        acc.revenue += point.revenue;
        return acc;
      },
      { orders: 0, revenue: 0 },
    );
  }, [data?.revenueSeries]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] rounded-[40px] bg-[radial-gradient(circle_at_top_right,rgba(217,104,80,0.12),rgba(217,104,80,0)_38%),radial-gradient(circle_at_top_left,rgba(216,168,91,0.12),rgba(216,168,91,0)_32%)]" />

      <Can
        perm="observability.metrics.read"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền xem dashboard vận hành.
          </div>
        }
      >
        <DashboardHero generatedAt={data?.generatedAt} isFetching={isFetching} onRefresh={() => void refetch()} />

        {error ? (
          <Alert className="border-[#fecaca] bg-[#fff7f7] text-[#991b1b]">
            <AlertDescription>
              {error.message}
              {error.correlationId ? <span className="mt-1 block text-xs">Mã: {error.correlationId}</span> : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading && !data ? <DashboardSkeleton /> : null}

        {!isLoading && data && summary ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <PrimaryMetricCard
                title="Tổng đơn hôm nay"
                value={formatCompactNumber(summary.ordersToday.current)}
                helper={`${summary.ordersToday.current} đơn đã được tạo hôm nay`}
                trend={summary.ordersToday}
                accent="from-[#fde2c3] via-[#f7c89c] to-[#e8a36a]"
              />

              <PrimaryMetricCard
                title="Doanh thu đã thu"
                value={formatCompactNumber(summary.revenueToday.current)}
                helper={formatVnd(summary.revenueToday.current)}
                trend={summary.revenueToday}
                accent="from-[#f7d7c7] via-[#e9a285] to-[#cf5b42]"
              />

              <PrimaryMetricCard
                title="Bàn đang hoạt động"
                value={String(summary.activeTables)}
                helper={`${summary.kitchenQueueCount} ticket bếp đang mở`}
                accent="from-[#f8ead7] via-[#efcfab] to-[#d8a85b]"
              />

              <PrimaryMetricCard
                title="Bill chưa thanh toán"
                value={String(summary.unpaidOrderCount)}
                helper={`${summary.lowStockCount} mặt hàng kho cần chú ý`}
                accent="from-[#f6ddba] via-[#e8bc79] to-[#cf8a3c]"
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
              <AnalyticsCard series={data.revenueSeries} chartTotals={chartTotals} summary={summary} />
              <OperationsPulseCard summary={summary} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)_minmax(320px,0.9fr)]">
              <RecentActivityCard items={data.recentActivity} />
              <TopItemsCard items={data.topItemsToday} />
              <WatchlistCard lowStockItems={data.lowStockItems} upcomingReservations={data.upcomingReservations} />
            </section>
          </>
        ) : null}
      </Can>
    </div>
  );
}
