import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RequireCustomerSession } from "../../../../shared/customer/session/guards";
import { markCustomerSessionClosedAfterPayment } from "../../../../shared/customer/session/sessionRecovery";
import { useOrderQuery } from "../../order/hooks/useOrderQuery";
import { useCreatePaymentMutation } from "../hooks/useCreatePaymentMutation";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";

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

  const candidates = [record.total, record.grandTotal, record.amountTotal, record.finalTotal, record.subtotal];
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

  const collections = [record.items, record.lines, record.orderItems, record.orderLines, record.details];
  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;

    return collection.reduce((acc, item) => {
      const row = item as Record<string, unknown>;
      const qty = row.qty ?? row.quantity ?? 1;
      const parsed = typeof qty === "number" ? qty : Number(qty);
      return acc + (Number.isFinite(parsed) ? parsed : 1);
    }, 0);
  }

  return null;
}

function getOrderDiscount(order: unknown): number | null {
  const record = order as Record<string, unknown> | null;
  if (!record) return null;

  const candidates = [record.discount, record.discountAmount, record.voucherDiscountAmount];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function getStatusTone(status: string): "default" | "positive" | "warn" | "danger" {
  if (status === "PAID" || status === "COMPLETED") return "positive";
  if (status === "NEW" || status === "RECEIVED" || status === "PREPARING" || status === "READY") return "warn";
  if (status === "CANCELLED" || status === "CANCELED") return "danger";
  return "default";
}

function PaymentContent() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const orderQuery = useOrderQuery(orderCode);
  const paymentMutation = useCreatePaymentMutation();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const status = orderQuery.data?.status ?? null;

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

  useEffect(() => {
    if (status === "PAID" || status === "COMPLETED") {
      markCustomerSessionClosedAfterPayment();
    }
  }, [status]);

  if (!orderCode) return null;

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Bước 2 / 2</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Thanh toán đơn hàng</h1>
          <p className="customer-hotpot-page-subtitle">Đang tải thông tin thanh toán cho đơn của bạn.</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="customer-hotpot-stat h-24 w-full" />
          <div className="customer-hotpot-stat h-24 w-full" />
          <div className="customer-hotpot-stat h-24 w-full" />
        </div>

        <div className="customer-hotpot-receipt rounded-[30px] p-6">
          <div className="h-32 rounded-[22px] bg-[#f2e5cf]" />
        </div>
      </div>
    );
  }

  if (orderQuery.error) {
    return (
      <div className="space-y-5">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Bước 2 / 2</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Thanh toán đơn hàng</h1>
          <p className="customer-hotpot-page-subtitle">
            Không thể tải thông tin đơn hàng để tiếp tục thanh toán.
          </p>
        </section>

        <div className="customer-hotpot-receipt rounded-[28px] border border-[#e4bfb4] p-5">
          <Alert variant="destructive" className="border-none bg-transparent p-0">
            <AlertDescription>
              {orderQuery.error.message}
              {orderQuery.error.correlationId ? (
                <span className="mt-1 block text-xs">Mã: {orderQuery.error.correlationId}</span>
              ) : null}
            </AlertDescription>
          </Alert>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => orderQuery.refetch()}
              className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
            >
              Thử lại
            </Button>
            <Link
              to={`/c/orders/${encodeURIComponent(orderCode)}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
              )}
            >
              Về trạng thái đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const order = orderQuery.data;
  const statusText = order?.status ?? "UNKNOWN";
  const label = statusLabel[statusText] ?? statusText;
  const total = getOrderTotal(order);
  const discount = getOrderDiscount(order);
  const itemCount = getOrderItemCount(order);

  const canPay =
    statusText !== "PAID" &&
    statusText !== "COMPLETED" &&
    statusText !== "CANCELLED" &&
    statusText !== "CANCELED";

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Bước 2 / 2</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Thanh toán đơn hàng</h1>
          <p className="customer-hotpot-page-subtitle">
            Xác nhận trạng thái đơn và tiếp tục sang cổng thanh toán khi sẵn sàng.
          </p>
        </div>

        <span className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold" data-tone={getStatusTone(statusText)}>
          {label}
        </span>
      </section>

      <div className={`grid gap-4 ${discount ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="customer-hotpot-stat px-5 py-4">
          <div className="customer-hotpot-kicker">Mã đơn</div>
          <div className="mt-2 font-mono text-sm font-semibold text-[#5a301a]">{orderCode}</div>
        </div>

        <div className="customer-hotpot-stat px-5 py-4">
          <div className="customer-hotpot-kicker">Số lượng món</div>
          <div className="customer-mythmaker-title mt-2 text-4xl text-[#5a301a]">{itemCount ?? "—"}</div>
        </div>

        <div className="customer-hotpot-stat px-5 py-4">
          <div className="customer-hotpot-kicker">Tạm tính</div>
          <div className="customer-mythmaker-title mt-2 text-4xl text-[#c43c2d]">
            {total != null ? formatVnd(total) : "—"}
          </div>
        </div>

        {discount ? (
          <div className="customer-hotpot-stat px-5 py-4">
            <div className="customer-hotpot-kicker">
              {order?.voucherCode ? `Voucher ${order.voucherCode}` : "Giảm giá"}
            </div>
            <div className="customer-mythmaker-title mt-2 text-4xl text-[#5f7a35]">
              {formatVnd(discount)}
            </div>
          </div>
        ) : null}
      </div>

      <section className="customer-hotpot-receipt rounded-[30px] p-5 sm:p-6">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Quầy thanh toán</div>
          <h2 className="customer-mythmaker-title text-3xl text-[#4e2916]">Chọn cách hoàn tất đơn</h2>
        </div>

        <div className="mt-6 space-y-5">
          {paymentMutation.error ? (
            <Alert variant="destructive" className="rounded-[22px] border-[#e4bfb4] bg-[#fff4ef]">
              <AlertDescription>
                {paymentMutation.error.message}
                {paymentMutation.error.correlationId ? (
                  <span className="mt-1 block text-xs">Mã: {paymentMutation.error.correlationId}</span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {!canPay ? (
            <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#7a5a43]">
              {status === "PAID"
                ? "Đơn hàng này đã thanh toán thành công. Phiên gọi món hiện tại sẽ kết thúc cùng bill này; muốn gọi thêm, bạn cần mở lại bàn."
                : statusText === "COMPLETED"
                  ? "Bill này đã hoàn tất. Nếu khách muốn gọi thêm, hãy mở lại bàn để tạo lượt mới."
                  : "Đơn hàng này không còn ở trạng thái cho phép thanh toán."}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#7a5a43]">
                {isOnline
                  ? "Nhấn nút bên dưới để chuyển sang VNPay. Sau khi hoàn tất, hệ thống sẽ đưa bạn quay lại trang kết quả."
                  : "Thiết bị đang offline. Kết nối mạng trước khi khởi tạo thanh toán."}
              </div>

              <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#7a5a43]">
                Nếu giao dịch bị hủy hoặc thất bại, đơn hàng vẫn được giữ lại để bạn quay về thử lại an toàn. Hệ thống đã bọc idempotency cho bước khởi tạo thanh toán.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {canPay ? (
              <Button
                className="w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110 sm:flex-1"
                size="lg"
                disabled={paymentMutation.isPending || !isOnline}
                onClick={() => paymentMutation.mutate({ orderCode })}
              >
                {paymentMutation.isPending ? "Đang chuyển sang VNPay..." : "Thanh toán qua VNPay"}
              </Button>
            ) : (
              <Link
                to={`/c/orders/${encodeURIComponent(orderCode)}`}
                className={cn(
                  buttonVariants({ size: "lg", variant: "default" }),
                  "w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110 sm:flex-1",
                )}
              >
                Xem trạng thái đơn
              </Link>
            )}

            {canPay ? (
              <Link
                to="/c/menu"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df] sm:w-auto",
                )}
              >
                Gọi thêm món
              </Link>
            ) : null}

            <Link
              to={`/c/orders/${encodeURIComponent(orderCode)}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df] sm:w-auto",
              )}
            >
              Theo dõi đơn
            </Link>

            {!canPay && (statusText === "PAID" || statusText === "COMPLETED") ? (
              <Link
                to="/c/qr?next=%2Fc%2Fmenu"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df] sm:w-auto",
                )}
              >
                Mở lại bàn để gọi thêm món
              </Link>
            ) : null}
          </div>

          {!isOnline && canPay ? (
            <p className="text-sm text-[#8a694f]">Đang offline, không thể khởi tạo thanh toán.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function CustomerPaymentPage() {
  return (
    <RequireCustomerSession>
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <PaymentContent />
      </CustomerHotpotShell>
    </RequireCustomerSession>
  );
}
