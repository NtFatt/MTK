import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RequireCustomerSession } from "../../../../shared/customer/session/guards";
import { useOrderQuery } from "../../order/hooks/useOrderQuery";
import { useCreatePaymentMutation } from "../hooks/useCreatePaymentMutation";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";

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

function getStatusToneClass(status: string): string {
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

function PaymentContent() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const orderQuery = useOrderQuery(orderCode);
  const paymentMutation = useCreatePaymentMutation();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!orderCode) return null;

  if (orderQuery.isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-semibold">Thanh toán đơn hàng</h1>
          <p className="mt-2 text-sm text-muted-foreground">Đang tải thông tin thanh toán…</p>
        </div>
      </main>
    );
  }

  if (orderQuery.error) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Thanh toán đơn hàng</h1>
          <p className="text-sm text-muted-foreground">
            Không thể tải thông tin đơn hàng để tiếp tục thanh toán.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertDescription>
            {orderQuery.error.message}
            {orderQuery.error.correlationId && (
              <span className="mt-1 block text-xs">Mã: {orderQuery.error.correlationId}</span>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => orderQuery.refetch()}>
            Thử lại
          </Button>
          <Link
            to={`/c/orders/${encodeURIComponent(orderCode)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Về trạng thái đơn
          </Link>
        </div>
      </main>
    );
  }

  const order = orderQuery.data;
  const status = order?.status ?? "UNKNOWN";
  const label = statusLabel[status] ?? status;

  const total = getOrderTotal(order);
  const itemCount = getOrderItemCount(order);

  const canPay =
    status !== "PAID" &&
    status !== "COMPLETED" &&
    status !== "CANCELLED" &&
    status !== "CANCELED";

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Thanh toán đơn hàng</h1>
        <p className="text-sm text-muted-foreground">
          Xác nhận trạng thái đơn và tiếp tục sang cổng thanh toán khi sẵn sàng.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Mã đơn</div>
          <div className="mt-1 font-mono text-sm font-semibold">{orderCode}</div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Số lượng món</div>
          <div className="mt-1 text-lg font-semibold">{itemCount ?? "—"}</div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tạm tính</div>
          <div className="mt-1 text-lg font-semibold">
            {total != null ? formatVnd(total) : "—"}
          </div>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Trạng thái thanh toán</h2>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getStatusToneClass(
                status,
              )}`}
            >
              {label}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            {canPay
              ? "Đơn hàng đang ở trạng thái cho phép thanh toán."
              : status === "PAID"
                ? "Đơn hàng này đã thanh toán thành công."
                : "Đơn hàng này không còn ở trạng thái cho phép thanh toán."}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {paymentMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {paymentMutation.error.message}
                {paymentMutation.error.correlationId && (
                  <span className="mt-1 block text-xs">Mã: {paymentMutation.error.correlationId}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!canPay ? (
            <Alert>
              <AlertDescription>
                {status === "PAID"
                  ? "Bạn có thể quay lại trang trạng thái đơn để theo dõi tiến trình phục vụ."
                  : "Đơn này đã kết thúc hoặc bị hủy, nên không thể tiếp tục thanh toán."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              {isOnline
                ? "Nhấn nút bên dưới để chuyển sang VNPay. Sau khi hoàn tất, hệ thống sẽ đưa bạn quay lại trang kết quả."
                : "Thiết bị đang offline. Kết nối mạng trước khi khởi tạo thanh toán."}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {canPay ? (
              <Button
                className="w-full sm:flex-1"
                size="lg"
                disabled={paymentMutation.isPending || !isOnline}
                onClick={() => paymentMutation.mutate({ orderCode })}
              >
                {paymentMutation.isPending ? "Đang chuyển sang VNPay…" : "Thanh toán qua VNPay"}
              </Button>
            ) : (
              <Link
                to={`/c/orders/${encodeURIComponent(orderCode)}`}
                className={buttonVariants({ size: "lg", variant: "default" }) + " w-full sm:flex-1"}
              >
                Xem trạng thái đơn
              </Link>
            )}

            <Link
              to={`/c/orders/${encodeURIComponent(orderCode)}`}
              className={buttonVariants({ variant: "outline", size: "lg" }) + " w-full sm:w-auto"}
            >
              Theo dõi đơn
            </Link>
          </div>

          {!isOnline && canPay && (
            <p className="text-sm text-muted-foreground">
              Đang offline, không thể khởi tạo thanh toán.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function CustomerPaymentPage() {
  return (
    <RequireCustomerSession>
      <div className="min-h-screen bg-background">
        <PaymentContent />
      </div>
    </RequireCustomerSession>
  );
}