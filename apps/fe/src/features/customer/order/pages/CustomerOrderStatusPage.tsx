import { Link, useParams } from "react-router-dom";

import { useOrderQuery } from "../hooks/useOrderQuery";
import {
  useCustomerSessionStore,
  selectSessionKey,
  selectBranchId,
} from "../../../../shared/customer/session/sessionStore";
import { useRealtimeRoom } from "../../../../shared/realtime";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

const statusLabel: Record<string, string> = {
  NEW: "Đơn mới",
  RECEIVED: "Bếp đã nhận",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng phục vụ",
  SERVING: "Đang phục vụ",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
};

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getOrderTotal(order: unknown): number | null {
  const record = order as Record<string, unknown> | null;
  if (!record) return null;

  const candidates = [
    record.total,
    record.grandTotal,
    record.amountTotal,
    record.finalTotal,
    record.subtotal,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function getOrderItemCount(order: unknown): number | null {
  const record = order as Record<string, unknown> | null;
  if (!record) return null;

  const collections = [
    record.items,
    record.lines,
    record.orderItems,
    record.orderLines,
    record.details,
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;

    const totalQty = collection.reduce((acc, item) => {
      const row = item as Record<string, unknown>;
      const qty = row.qty ?? row.quantity ?? 1;
      const parsed = typeof qty === "number" ? qty : Number(qty);
      return acc + (Number.isFinite(parsed) ? parsed : 1);
    }, 0);

    return totalQty;
  }

  return null;
}

function getStatusToneClass(status: string | null): string {
  if (status === "PAID") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "COMPLETED") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  if (status === "CANCELLED" || status === "CANCELED") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-border bg-muted/40 text-foreground";
}

export function CustomerOrderStatusPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const { data, isLoading, error, refetch, dataUpdatedAt, isFetching } = useOrderQuery(orderCode);

  const sessionKey = useCustomerSessionStore(selectSessionKey);
  const branchId = useCustomerSessionStore(selectBranchId);

  useRealtimeRoom(
    orderCode ? `order:${orderCode}` : null,
    !!orderCode,
    sessionKey
      ? {
          kind: "customer",
          userKey: sessionKey,
          branchId: branchId ?? undefined,
        }
      : undefined,
  );

  const status = data?.status ?? null;
  const label = status ? (statusLabel[status] ?? status) : "—";
  const total = getOrderTotal(data);
  const itemCount = getOrderItemCount(data);

  const canPay =
    !!orderCode &&
    status !== null &&
    status !== "PAID" &&
    status !== "COMPLETED" &&
    status !== "CANCELLED" &&
    status !== "CANCELED";

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Theo dõi đơn</h1>
          <p className="mt-2 text-sm text-muted-foreground">Đang tải trạng thái đơn hàng…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Theo dõi đơn</h1>
          <p className="text-sm text-muted-foreground">
            Không thể tải trạng thái đơn hàng ở thời điểm hiện tại.
          </p>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-card p-4">
          <p className="text-destructive">Có lỗi khi tải trạng thái đơn.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>

          {error.correlationId ? (
            <p className="mt-1 text-xs text-muted-foreground">Mã: {error.correlationId}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Thử lại
            </button>

            {orderCode ? (
              <Link
                to={`/c/payment/${encodeURIComponent(orderCode)}`}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Sang thanh toán
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Theo dõi đơn</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi trạng thái xử lý đơn hàng và tiếp tục thanh toán khi cần.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Mã đơn</div>
          <div className="mt-1 font-mono text-sm font-semibold">{orderCode ?? "—"}</div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Số lượng món</div>
          <div className="mt-1 text-lg font-semibold">{itemCount ?? "—"}</div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tổng đơn</div>
          <div className="mt-1 text-lg font-semibold">{total != null ? formatVnd(total) : "—"}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Trạng thái hiện tại</div>
              <div className="mt-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-sm font-medium",
                    getStatusToneClass(status),
                  )}
                >
                  {label}
                </span>
              </div>
            </div>

            {status === "PAID" ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
                Đơn này đã thanh toán. Bạn có thể tiếp tục theo dõi tiến trình phục vụ.
              </div>
            ) : null}

            {canPay ? (
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Đơn chưa thanh toán. Bạn có thể tiếp tục sang bước thanh toán ngay bây giờ.
              </div>
            ) : null}

            {(status === "CANCELLED" || status === "CANCELED") && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Đơn hàng đã bị hủy, nên không thể tiếp tục thanh toán.
              </div>
            )}

            {status === "COMPLETED" && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                Đơn hàng đã hoàn tất.
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
            {canPay ? (
              <Link
                to={`/c/payment/${encodeURIComponent(orderCode!)}`}
                className={buttonVariants({ size: "lg", variant: "default" }) + " w-full"}
              >
                Thanh toán ngay
              </Link>
            ) : (
              <Link
                to={`/c/payment/${encodeURIComponent(orderCode!)}`}
                className={buttonVariants({ size: "lg", variant: "outline" }) + " w-full"}
              >
                Xem trang thanh toán
              </Link>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
              disabled={isFetching}
              aria-busy={isFetching}
            >
              {isFetching ? "Đang cập nhật…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">
          Cập nhật lần cuối:{" "}
          {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : "—"}
        </div>
      </div>
    </main>
  );
}