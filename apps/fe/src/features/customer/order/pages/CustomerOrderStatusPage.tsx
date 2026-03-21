import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

import { useOrderQuery } from "../hooks/useOrderQuery";
import {
  useCustomerSessionStore,
  selectSessionKey,
  selectBranchId,
} from "../../../../shared/customer/session/sessionStore";
import { markCustomerSessionClosedAfterPayment } from "../../../../shared/customer/session/sessionRecovery";
import { useRealtimeRoom } from "../../../../shared/realtime";
import { buttonVariants } from "../../../../shared/ui/button";
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

function getStatusTone(status: string | null): "default" | "positive" | "warn" | "danger" {
  if (status === "PAID" || status === "COMPLETED") return "positive";
  if (status === "NEW" || status === "RECEIVED" || status === "PREPARING" || status === "READY" || status === "SERVING" || status === "SERVED") return "warn";
  if (status === "CANCELLED" || status === "CANCELED") return "danger";
  return "default";
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
          sessionKey,
          branchId: branchId ?? undefined,
        }
      : undefined,
  );

  const status = data?.status ?? null;
  const label = status ? (statusLabel[status] ?? status) : "—";
  const total = getOrderTotal(data);
  const discount = getOrderDiscount(data);
  const itemCount = getOrderItemCount(data);

  useEffect(() => {
    if (status === "PAID" || status === "COMPLETED") {
      markCustomerSessionClosedAfterPayment();
    }
  }, [status]);

  const canPay =
    !!orderCode &&
    status !== null &&
    status !== "PAID" &&
    status !== "COMPLETED" &&
    status !== "CANCELLED" &&
    status !== "CANCELED";

  if (isLoading) {
    return (
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <div className="customer-hotpot-receipt rounded-[30px] px-6 py-10 text-center">
          <div className="customer-mythmaker-script text-[2rem] text-[#bd5132]">Bếp đang cập nhật</div>
          <p className="mt-3 text-sm text-[#7b5a42]">Đang tải trạng thái đơn hàng của bạn.</p>
        </div>
      </CustomerHotpotShell>
    );
  }

  if (error) {
    return (
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <div className="space-y-5">
          <section className="space-y-2">
            <div className="customer-hotpot-kicker">Theo dõi đơn</div>
            <h1 className="customer-mythmaker-title customer-hotpot-page-title">Trạng thái đơn hàng</h1>
            <p className="customer-hotpot-page-subtitle">
              Không thể tải trạng thái đơn hàng ở thời điểm hiện tại.
            </p>
          </section>

          <div className="customer-hotpot-receipt rounded-[28px] border border-[#e4bfb4] p-5">
            <p className="text-[#a02f26]">Có lỗi khi tải trạng thái đơn.</p>
            <p className="mt-2 text-sm text-[#7b5a42]">{error.message}</p>
            {error.correlationId ? (
              <p className="mt-1 text-xs text-[#8a694f]">Mã: {error.correlationId}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-4 py-2 text-sm font-medium text-[#6a3b20] hover:bg-[#fff2df]"
              >
                Thử lại
              </button>

              {orderCode ? (
                <Link
                  to={`/c/payment/${encodeURIComponent(orderCode)}`}
                  className="rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-4 py-2 text-sm font-medium text-[#6a3b20] hover:bg-[#fff2df]"
                >
                  Sang thanh toán
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </CustomerHotpotShell>
    );
  }

  return (
    <CustomerHotpotShell contentClassName="max-w-5xl">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="customer-hotpot-kicker">Theo dõi đơn</div>
            <h1 className="customer-mythmaker-title customer-hotpot-page-title">Trạng thái đơn hàng</h1>
            <p className="customer-hotpot-page-subtitle">
              Theo dõi bếp xử lý đơn và tiếp tục thanh toán khi cần.
            </p>
          </div>

          <span className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold" data-tone={getStatusTone(status)}>
            {label}
          </span>
        </section>

        <div className={`grid gap-4 ${discount ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <div className="customer-hotpot-stat px-5 py-4">
            <div className="customer-hotpot-kicker">Mã đơn</div>
            <div className="mt-2 font-mono text-sm font-semibold text-[#5a301a]">{orderCode ?? "—"}</div>
          </div>

          <div className="customer-hotpot-stat px-5 py-4">
            <div className="customer-hotpot-kicker">Số lượng món</div>
            <div className="customer-mythmaker-title mt-2 text-4xl text-[#5a301a]">{itemCount ?? "—"}</div>
          </div>

          <div className="customer-hotpot-stat px-5 py-4">
            <div className="customer-hotpot-kicker">Tổng đơn</div>
            <div className="customer-mythmaker-title mt-2 text-4xl text-[#c43c2d]">
              {total != null ? formatVnd(total) : "—"}
            </div>
          </div>

          {discount ? (
            <div className="customer-hotpot-stat px-5 py-4">
              <div className="customer-hotpot-kicker">
                {data?.voucherCode ? `Voucher ${data.voucherCode}` : "Giảm giá"}
              </div>
              <div className="customer-mythmaker-title mt-2 text-4xl text-[#5f7a35]">
                {formatVnd(discount)}
              </div>
            </div>
          ) : null}
        </div>

        <section className="customer-hotpot-receipt rounded-[30px] p-5 sm:p-6">
          <div className="space-y-2">
            <div className="customer-hotpot-kicker">Quầy bếp</div>
            <h2 className="customer-mythmaker-title text-3xl text-[#4e2916]">Tiến trình phục vụ</h2>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="customer-hotpot-stat rounded-[24px] px-5 py-4">
                <div className="text-sm text-[#7a5a43]">Trạng thái hiện tại</div>
                <div className="mt-3">
                  <span className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold" data-tone={getStatusTone(status)}>
                    {label}
                  </span>
                </div>
              </div>

              {status === "PAID" ? (
                <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#5f7a35]">
                  Đơn này đã thanh toán. Phiên gọi món hiện tại sẽ kết thúc cùng bill này; nếu muốn gọi thêm, bạn cần mở lại bàn.
                </div>
              ) : null}

              {canPay ? (
                <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#8a5d1e]">
                  Đơn chưa thanh toán. Bạn có thể tiếp tục sang bước thanh toán ngay bây giờ.
                </div>
              ) : null}

              {status === "CANCELLED" || status === "CANCELED" ? (
                <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#a44b42]">
                  Đơn hàng đã bị hủy, nên không thể tiếp tục thanh toán.
                </div>
              ) : null}

              {status === "COMPLETED" ? (
                <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#5f7a35]">
                  Đơn hàng đã hoàn tất. Muốn tiếp tục gọi thêm món, hãy mở lại bàn để tạo lượt mới.
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {canPay ? (
                <>
                  <Link
                    to={`/c/payment/${encodeURIComponent(orderCode!)}`}
                    className={cn(
                      buttonVariants({ size: "lg", variant: "default" }),
                      "w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110",
                    )}
                  >
                    Thanh toán ngay
                  </Link>

                  <Link
                    to="/c/menu"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
                    )}
                  >
                    Gọi thêm món
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={`/c/payment/${encodeURIComponent(orderCode!)}`}
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
                    )}
                  >
                    Xem trang thanh toán
                  </Link>

                  {(status === "PAID" || status === "COMPLETED") ? (
                    <Link
                      to="/c/qr?next=%2Fc%2Fmenu"
                      className={cn(
                        buttonVariants({ size: "lg", variant: "outline" }),
                        "w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
                      )}
                    >
                      Mở lại bàn để gọi thêm món
                    </Link>
                  ) : null}
                </>
              )}

              <button
                type="button"
                onClick={() => refetch()}
                className="w-full rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-4 py-3 text-sm font-medium text-[#6a3b20] hover:bg-[#fff2df]"
                disabled={isFetching}
                aria-busy={isFetching}
              >
                {isFetching ? "Đang cập nhật..." : "Làm mới trạng thái"}
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-[#e0c49d]/70 pt-4 text-xs text-[#8a694f]">
            Cập nhật lần cuối: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : "—"}
          </div>
        </section>
      </div>
    </CustomerHotpotShell>
  );
}
