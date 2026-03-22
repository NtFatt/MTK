import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { hasPermission } from "../../../../shared/auth/permissions";
import { subscribeRealtime, useRealtimeRoom, type EventEnvelope } from "../../../../shared/realtime";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Input } from "../../../../shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";
import { cn } from "../../../../shared/utils/cn";
import { summarizeItemCustomization } from "../../../customer/shared/itemCustomization";
import { useInternalOrdersQuery } from "../hooks/useInternalOrdersQuery";
import type { InternalOrderItem, InternalOrderRow } from "../services/ordersApi";

const STATUS_TABS = [
  { value: "ALL", label: "Tất cả" },
  { value: "NEW", label: "NEW" },
  { value: "RECEIVED", label: "RECEIVED" },
  { value: "PREPARING", label: "PREPARING" },
  { value: "READY", label: "READY" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "PAID", label: "PAID" },
  { value: "CANCELED", label: "CANCELED" },
] as const;

const ORDER_FLOW = ["NEW", "RECEIVED", "PREPARING", "READY", "COMPLETED", "PAID"] as const;

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function normStatus(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Không rõ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeOnly(value?: string | null): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(value?: string | null): string {
  if (!value) return "Không rõ ngày";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ ngày";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatElapsedFrom(value?: string | null): string {
  if (!value) return "Không rõ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Không rõ";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function getSeatAnchor(order: Pick<InternalOrderRow, "sessionOpenedAt" | "createdAt">): string | null {
  return order.sessionOpenedAt ?? order.createdAt ?? null;
}

function getOrderTotal(order: Pick<InternalOrderRow, "totalAmount" | "subtotalAmount">): number {
  const value = order.totalAmount ?? order.subtotalAmount ?? 0;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function truncateText(value: string | null | undefined, max = 72): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function getStatusMeta(status: string) {
  const normalized = normStatus(status);

  switch (normalized) {
    case "NEW":
      return {
        label: "Mới tạo",
        badgeClassName: "border-[#f1d7a2] bg-[#fff3d6] text-[#8f5b17]",
        dotClassName: "bg-[#e5b85c]",
      };
    case "RECEIVED":
      return {
        label: "Đã nhận",
        badgeClassName: "border-[#f4c09c] bg-[#fff0e4] text-[#b26023]",
        dotClassName: "bg-[#d78447]",
      };
    case "PREPARING":
      return {
        label: "Đang chế biến",
        badgeClassName: "border-[#f1b3b3] bg-[#fff0f0] text-[#b13c3c]",
        dotClassName: "bg-[#d35656]",
      };
    case "READY":
      return {
        label: "Sẵn sàng",
        badgeClassName: "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]",
        dotClassName: "bg-[#6ca45d]",
      };
    case "COMPLETED":
      return {
        label: "Hoàn tất phục vụ",
        badgeClassName: "border-[#c9d7f2] bg-[#eef4ff] text-[#335c9c]",
        dotClassName: "bg-[#6489c7]",
      };
    case "PAID":
      return {
        label: "Đã thanh toán",
        badgeClassName: "border-[#bad7d4] bg-[#edf9f7] text-[#2d6d66]",
        dotClassName: "bg-[#4ea59b]",
      };
    case "CANCELED":
      return {
        label: "Đã hủy",
        badgeClassName: "border-[#f1b8b8] bg-[#fff1f1] text-[#a03f3f]",
        dotClassName: "bg-[#d87474]",
      };
    default:
      return {
        label: normalized || "Không rõ",
        badgeClassName: "border-[#ead8c0] bg-[#fffaf4] text-[#6d4928]",
        dotClassName: "bg-[#b7926c]",
      };
  }
}

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const prefixes = ["ops:", "branch:", "kitchen:", "cashier:"];
  for (const prefix of prefixes) {
    if (env.room.startsWith(prefix)) {
      const value = env.room.slice(prefix.length).trim();
      if (value) return value;
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

function isOrderCenterRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;
  if (env.type === "realtime.gap" && env.room === `ops:${branchId}`) return true;
  if (env.room === `ops:${branchId}`) return true;

  const branchFromEvent = extractBranchIdFromRealtime(env);
  if (branchFromEvent !== branchId) return false;

  return env.type.startsWith("order.") || env.type.startsWith("payment.");
}

function groupOrdersByDay(rows: InternalOrderRow[]) {
  const groups = new Map<string, { label: string; rows: InternalOrderRow[] }>();

  for (const row of rows) {
    const anchor = row.updatedAt ?? row.createdAt ?? null;
    const label = formatDayLabel(anchor);
    const key = label;
    if (!groups.has(key)) {
      groups.set(key, { label, rows: [] });
    }
    groups.get(key)?.rows.push(row);
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    rows: value.rows,
  }));
}

function ReceiptField({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="grid gap-2 border-b border-[#efe3d3] py-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="text-sm text-[#8a684d]">{label}</div>
      <div className={cn("text-sm text-[#4e2916]", emphasized && "font-semibold")}>{value}</div>
    </div>
  );
}

function StatusSteps({ status }: { status: string }) {
  const normalized = normStatus(status);
  const activeIndex = ORDER_FLOW.indexOf(normalized as (typeof ORDER_FLOW)[number]);
  if (activeIndex < 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {ORDER_FLOW.map((step, index) => {
        const isCurrent = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <div
            key={step}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              isCurrent
                ? "border-[#cf5b42] bg-[#fff1ea] text-[#8f3224]"
                : isDone
                  ? "border-[#cfe3c6] bg-[#f4fbef] text-[#4f7b46]"
                  : "border-[#ead8c0] bg-white text-[#92725a]",
            )}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}

function OrderActivityRow({
  order,
  selected,
  onSelect,
}: {
  order: InternalOrderRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = getStatusMeta(order.orderStatus);
  const snippet = truncateText(order.orderNote, 56);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border-b border-[#efe3d3] px-4 py-4 text-left transition last:border-b-0 hover:bg-[#fff9f1]",
        selected && "bg-[#fff4e8]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            selected ? "border-[#cf5b42] bg-[#fff1ea] text-[#8f3224]" : "border-[#e7d7c3] bg-white text-[#8a684d]",
          )}
        >
          ₫
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-[#3f2415]">
                {formatVnd(getOrderTotal(order))}
              </div>
              <div className="truncate text-sm text-[#6e4a31]">
                {order.orderCode}
                {order.tableCode ? ` • Bàn ${order.tableCode}` : ""}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-sm font-medium text-[#6e4a31]">
                {formatTimeOnly(order.updatedAt ?? order.createdAt)}
              </div>
              <div className="mt-1 flex items-center justify-end gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", status.dotClassName)} />
                <span className="text-xs text-[#8a684d]">{status.label}</span>
              </div>
            </div>
          </div>

          {snippet ? (
            <div className="mt-2 text-xs text-[#8b684c]">{snippet}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function OrderItemLine({ item }: { item: InternalOrderItem }) {
  const customization = summarizeItemCustomization(item.itemOptions ?? null);

  return (
    <div className="rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-[#4e2916]">{item.itemName}</div>
          <div className="mt-1 text-sm text-[#7a5a43]">
            {formatVnd(item.unitPrice)} × {item.quantity}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm font-semibold text-[#c43c2d]">
          {formatVnd(item.lineTotal)}
        </div>
      </div>

      {customization.chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {customization.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[#dfc49f]/75 bg-white px-3 py-1 text-xs font-medium text-[#6e4424]"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {customization.note ? (
        <div className="mt-3 rounded-[14px] border border-dashed border-[#e4c8a1]/70 bg-white px-3 py-2 text-sm text-[#7a5a43]">
          Ghi chú món: <span className="font-medium text-[#5a311b]">{customization.note}</span>
        </div>
      ) : null}
    </div>
  );
}

function OrderDetailPanel({ order, branchId }: { order: InternalOrderRow | null; branchId: string }) {
  if (!order) {
    return (
      <section className="flex min-h-[720px] items-center justify-center bg-white px-6 py-8">
        <div className="max-w-md rounded-[28px] border border-dashed border-[#e7cfaf] bg-[#fffaf4] px-6 py-12 text-center text-[#7a5a43]">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#a07b59]">Biên lai</div>
          <div className="mt-4 text-2xl font-semibold text-[#4e2916]">Chưa chọn đơn nào</div>
          <p className="mt-3 text-sm leading-6">
            Bấm vào một dòng ở danh sách hoạt động bên trái để xem chi tiết món, voucher, ghi chú
            và tình trạng xử lý.
          </p>
        </div>
      </section>
    );
  }

  const status = getStatusMeta(order.orderStatus);
  const subtotal = Number(order.subtotalAmount ?? 0);
  const discount = Number(order.discountAmount ?? 0);
  const total = getOrderTotal(order);
  const seatTime = formatElapsedFrom(getSeatAnchor(order));
  const showCashierShortcut =
    normStatus(order.orderStatus) !== "PAID" && normStatus(order.orderStatus) !== "CANCELED";

  return (
    <section className="flex min-h-[720px] flex-col bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee1cf] px-6 py-5">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[#9f7751]">Hoạt động đã chọn</div>
          <div className="mt-2 text-3xl font-semibold text-[#3f2415]">{formatVnd(total)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", status.badgeClassName)}>
            {status.label}
          </span>
          <Link
            to={`/i/${branchId}/kitchen`}
            className="rounded-full border border-[#ead8c0] bg-[#fffaf4] px-4 py-2 text-sm font-medium text-[#6d4928] transition hover:bg-[#fff1e4]"
          >
            Kitchen
          </Link>
          {showCashierShortcut ? (
            <Link
              to={`/i/${branchId}/cashier`}
              className="rounded-full border border-[#ead8c0] bg-[#fffaf4] px-4 py-2 text-sm font-medium text-[#6d4928] transition hover:bg-[#fff1e4]"
            >
              Cashier
            </Link>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[#9f7751]">Biên lai</div>
              <div className="mt-2 text-xl font-semibold text-[#4e2916]">{order.orderCode}</div>
            </div>
            <StatusSteps status={order.orderStatus} />
          </div>

          <div className="rounded-[24px] border border-[#ead8c0] bg-[#fffdf9] px-5 py-2">
            <ReceiptField label="Loại phục vụ" value={order.tableCode ? "Dùng tại quán" : "Không gắn bàn"} />
            <ReceiptField label="Bàn" value={order.tableCode ? order.tableCode : "Không rõ"} />
            <ReceiptField label="Trạng thái" value={status.label} />
            <ReceiptField label="Thời gian" value={formatDateTime(order.updatedAt ?? order.createdAt)} />
            <ReceiptField label="Khách ngồi" value={seatTime} />
            <ReceiptField
              label="Voucher"
              value={order.voucherCode || order.voucherName ? order.voucherCode ?? order.voucherName ?? "" : "Không áp dụng"}
            />
            <ReceiptField label="Số món" value={`${order.totalItemCount ?? 0} món • ${order.uniqueItemCount ?? 0} loại`} />
            {order.orderNote ? (
              <ReceiptField label="Ghi chú khách" value={order.orderNote} emphasized />
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9f7751]">
                Món hàng
              </div>
              {order.items.length > 0 ? (
                order.items.map((item) => <OrderItemLine key={item.orderItemId} item={item} />)
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#e7cfaf] bg-[#fffaf4] px-4 py-6 text-sm text-[#7a5a43]">
                  Đơn này chưa có dòng món nào được snapshot.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[#ead8c0] bg-[#fff8ed] px-5 py-5">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9f7751]">
                  Thanh toán
                </div>
                <div className="mt-4 space-y-3 text-sm text-[#7a5a43]">
                  <div className="flex items-center justify-between">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-[#4e2916]">{formatVnd(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Giảm giá</span>
                    <span className="font-semibold text-[#4e2916]">
                      {discount > 0 ? `-${formatVnd(discount)}` : "Không có"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#ecd9bf] pt-3 text-base font-semibold text-[#4e2916]">
                    <span>Tổng cuối</span>
                    <span className="text-[#c43c2d]">{formatVnd(total)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ead8c0] bg-white px-5 py-5">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9f7751]">
                  Theo dõi nhanh
                </div>
                <div className="mt-4 space-y-3 text-sm text-[#7a5a43]">
                  <div className="flex items-center justify-between">
                    <span>Cập nhật gần nhất</span>
                    <span className="font-medium text-[#4e2916]">
                      {formatTimeOnly(order.updatedAt ?? order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mã bill</span>
                    <span className="font-medium text-[#4e2916]">{order.orderCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bill đang mở</span>
                    <span className="font-medium text-[#4e2916]">
                      {showCashierShortcut ? "Có thể thu ngân xử lý" : "Đã khóa thanh toán"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function InternalOrdersPage() {
  const session = useStore(authStore, (state) => state.session);
  const { branchId } = useParams<{ branchId: string }>();
  const branchParam = String(branchId ?? "").trim();
  const role = session?.role;
  const userBranch = session?.branchId;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && branchParam && String(userBranch) !== String(branchParam);
  const canReadOrders = hasPermission(session, "orders.read");
  const enabled = !!session && !!branchParam && !isBranchMismatch && canReadOrders;

  useRealtimeRoom(
    branchParam ? `ops:${branchParam}` : null,
    enabled && !!branchParam,
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId: branchParam || (session.branchId != null ? String(session.branchId) : undefined),
          token: session.accessToken,
        }
      : undefined,
  );

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["value"]>("ALL");
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);

  const statuses = tab === "ALL" ? undefined : [tab];
  const { data, isLoading, isFetching, error, refetch } = useInternalOrdersQuery({
    branchId: branchParam,
    enabled,
    statuses,
    q: query,
    limit: 120,
  });

  useEffect(() => {
    if (!enabled) return;
    const handler: EventListener = () => {
      void refetch();
    };
    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled || !branchParam) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeRealtime((env) => {
      if (!isOrderCenterRealtimeEvent(env, branchParam)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refetch();
      }, 80);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, branchParam, refetch]);

  const rows = useMemo(() => data ?? [], [data]);
  const selectedOrder = useMemo(
    () => rows.find((row) => row.orderCode === selectedOrderCode) ?? null,
    [rows, selectedOrderCode],
  );
  const groupedRows = useMemo(() => groupOrdersByDay(rows), [rows]);

  const stats = useMemo(() => {
    const pendingStatuses = new Set(["NEW", "RECEIVED", "PREPARING", "READY", "COMPLETED", "SERVING", "DELIVERING"]);
    const paidRows = rows.filter((row) => normStatus(row.orderStatus) === "PAID");
    const canceledRows = rows.filter((row) => normStatus(row.orderStatus) === "CANCELED");
    const activeRows = rows.filter((row) => pendingStatuses.has(normStatus(row.orderStatus)));
    const recognizedRevenue = paidRows.reduce((sum, row) => sum + getOrderTotal(row), 0);

    return {
      total: rows.length,
      active: activeRows.length,
      paid: paidRows.length,
      canceled: canceledRows.length,
      recognizedRevenue,
    };
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {isBranchMismatch && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="orders.read"
          fallback={
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">orders.read</span>
            </div>
          }
        >
          <section className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">Order center</div>
              <h1 className="text-3xl font-semibold text-[#4e2916]">Hoạt động đơn hàng</h1>
              <p className="max-w-3xl text-sm leading-6 text-[#7a5a43]">
                Xem đơn như một bảng hoạt động: chọn dòng bên trái để mở biên lai chi tiết bên
                phải, theo đúng nhịp dùng của quản lý quầy và điều phối vận hành.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-[#ecd9bf] bg-white px-4 py-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Tổng đơn</div>
                <div className="mt-2 text-3xl font-semibold text-[#4e2916]">{stats.total}</div>
              </div>
              <div className="rounded-[22px] border border-[#ecd9bf] bg-white px-4 py-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Đang mở</div>
                <div className="mt-2 text-3xl font-semibold text-[#b26023]">{stats.active}</div>
              </div>
              <div className="rounded-[22px] border border-[#ecd9bf] bg-white px-4 py-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Đã thanh toán</div>
                <div className="mt-2 text-3xl font-semibold text-[#2d6d66]">{stats.paid}</div>
              </div>
              <div className="rounded-[22px] border border-[#ecd9bf] bg-white px-4 py-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Doanh thu ghi nhận</div>
                <div className="mt-2 text-2xl font-semibold text-[#c43c2d]">
                  {stats.recognizedRevenue > 0 ? formatVnd(stats.recognizedRevenue) : "Chưa có"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#ead8c0] bg-[#fffdf9] shadow-[0_20px_44px_-34px_rgba(60,29,9,0.24)]">
            <div className="grid min-h-[760px] xl:grid-cols-[390px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-b border-[#efe1cf] bg-[#fffbf5] xl:border-b-0 xl:border-r">
                <div className="space-y-4 border-b border-[#efe1cf] px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-[#9f7751]">Hoạt động</div>
                      <div className="mt-1 text-xl font-semibold text-[#4e2916]">Danh sách đơn</div>
                    </div>
                    <div className="rounded-full border border-[#ead8c0] bg-white px-3 py-1 text-xs text-[#7a5a43]">
                      {isFetching ? "Đang làm mới" : `${rows.length} đơn`}
                    </div>
                  </div>

                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm theo mã đơn, bàn, voucher, ghi chú..."
                    className="h-11"
                  />

                  <Tabs
                    value={tab}
                    onValueChange={(value) =>
                      setTab(value as (typeof STATUS_TABS)[number]["value"])
                    }
                  >
                    <TabsList className="flex h-auto flex-wrap gap-1">
                      {STATUS_TABS.map((status) => (
                        <TabsTrigger key={status.value} value={status.value}>
                          {status.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-[18px] border border-[#ead8c0] bg-white px-3 py-3 text-sm text-[#7a5a43]">
                      <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Đang mở</div>
                      <div className="mt-1 text-lg font-semibold text-[#4e2916]">{stats.active}</div>
                    </div>
                    <div className="rounded-[18px] border border-[#ead8c0] bg-white px-3 py-3 text-sm text-[#7a5a43]">
                      <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Đã hủy</div>
                      <div className="mt-1 text-lg font-semibold text-[#4e2916]">{stats.canceled}</div>
                    </div>
                    <div className="rounded-[18px] border border-[#ead8c0] bg-white px-3 py-3 text-sm text-[#7a5a43]">
                      <div className="text-xs uppercase tracking-[0.2em] text-[#a18366]">Doanh thu</div>
                      <div className="mt-1 text-lg font-semibold text-[#4e2916]">
                        {stats.recognizedRevenue > 0 ? formatVnd(stats.recognizedRevenue) : "0 đ"}
                      </div>
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="px-5 pt-4">
                    <Alert variant="destructive">
                      <AlertDescription>
                        {error.message}
                        {error.correlationId ? (
                          <span className="mt-1 block text-xs">Mã: {error.correlationId}</span>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 7 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-[92px] animate-pulse rounded-[22px] border border-[#ead8c0] bg-white/80"
                        />
                      ))}
                    </div>
                  ) : groupedRows.length > 0 ? (
                    groupedRows.map((group) => (
                      <div key={group.key}>
                        <div className="sticky top-0 z-[1] border-y border-[#efe1cf] bg-[#fff9f1] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#9f7751]">
                          {group.label}
                        </div>
                        {group.rows.map((order) => (
                          <OrderActivityRow
                            key={order.orderCode}
                            order={order}
                            selected={selectedOrderCode === order.orderCode}
                            onSelect={() => setSelectedOrderCode(order.orderCode)}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-10 text-center text-sm text-[#7a5a43]">
                      Không có đơn nào khớp với bộ lọc hiện tại.
                    </div>
                  )}
                </div>
              </aside>

              <OrderDetailPanel order={selectedOrder} branchId={branchParam} />
            </div>
          </section>
        </Can>
      )}
    </div>
  );
}
