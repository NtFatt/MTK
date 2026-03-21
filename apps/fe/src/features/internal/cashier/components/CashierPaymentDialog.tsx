import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { summarizeItemCustomization } from "../../../customer/shared/itemCustomization";
import type { CashierOrderRow } from "../services/cashierQueueApi";
import {
  formatDateTime,
  formatElapsedFrom,
  formatVnd,
  getCashierStatusMeta,
  getCashierTotal,
  getSeatAnchor,
  roundUp,
} from "../utils/cashierDisplay";

type CashierPaymentMethod = "CASH" | "SHOPEEPAY" | "VISA" | "MASTER" | "JCB" | "ATM" | "OTHER";

type CashierPaymentDialogProps = {
  order: CashierOrderRow | null;
  isPending: boolean;
  errorMessage?: string | null;
  correlationId?: string | null;
  onClose: () => void;
  onConfirm: (orderCode: string) => void;
};

const PAYMENT_METHODS: Array<{ key: CashierPaymentMethod; label: string; enabled: boolean }> = [
  { key: "CASH", label: "Tiền mặt", enabled: true },
  { key: "SHOPEEPAY", label: "ShopeePay", enabled: false },
  { key: "VISA", label: "VISA", enabled: false },
  { key: "MASTER", label: "Master", enabled: false },
  { key: "JCB", label: "JCB", enabled: false },
  { key: "ATM", label: "ATM", enabled: false },
  { key: "OTHER", label: "Khác", enabled: false },
];

export function CashierPaymentDialog({
  order,
  isPending,
  errorMessage,
  correlationId,
  onClose,
  onConfirm,
}: CashierPaymentDialogProps) {
  const total = getCashierTotal(order ?? {});
  const seatAnchor = getSeatAnchor(order ?? {});
  const statusMeta = getCashierStatusMeta(String(order?.orderStatus ?? ""));
  const [payMethod, setPayMethod] = useState<CashierPaymentMethod>("CASH");
  const [received, setReceived] = useState<number>(() => total || 0);
  const quickAmounts = useMemo(() => {
    if (!total) return [];
    return Array.from(
      new Set([total, roundUp(total, 1000), roundUp(total, 5000), roundUp(total, 10000), total + 50000, total + 100000]),
    )
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
  }, [total]);

  useEffect(() => {
    if (!order) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [order, isPending, onClose]);

  if (!order) return null;

  const missing = Math.max(0, total - received);
  const change = Math.max(0, received - total);
  const canConfirm = payMethod === "CASH" && (total === 0 || received >= total) && !isPending;
  const settlementTone =
    total === 0
      ? "border-[#d9bd95] bg-[#fff8ec] text-[#6a3b20]"
      : missing > 0
        ? "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]"
        : change > 0
          ? "border-[#b4dec4] bg-[#edf8f1] text-[#1c7c44]"
          : "border-[#e6d8c4] bg-[#fff8ef] text-[#876341]";
  const settlementMessage =
    total === 0
      ? "Bill này chưa có tổng tiền hợp lệ. Thu ngân nên kiểm tra lại trước khi settle."
      : missing > 0
        ? `Khách còn thiếu ${formatVnd(missing)} để hoàn tất thanh toán.`
        : change > 0
          ? `Thu ngân cần thối lại ${formatVnd(change)} cho khách.`
          : "Khách đã đưa đúng số tiền cần thanh toán.";

  const pressDigit = (digit: number) => setReceived((value) => value * 10 + digit);
  const press00 = () => setReceived((value) => value * 100);
  const press000 = () => setReceived((value) => value * 1000);
  const backspace = () => setReceived((value) => Math.floor(value / 10));
  const clear = () => setReceived(0);

  return (
    <div
      className="fixed inset-0 z-[70] bg-[rgba(29,16,8,0.56)] p-4 backdrop-blur-sm sm:p-6"
      onClick={() => {
        if (!isPending) onClose();
      }}
    >
      <div
        className="mx-auto flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[30px] border border-[#e4cfae] bg-[linear-gradient(180deg,#fffaf4_0%,#fff3e7_100%)] shadow-[0_36px_80px_-34px_rgba(44,19,7,0.72)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ead8c0] px-6 py-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">Thanh toán thu ngân</div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-[#4e2916]">
                {order.tableCode ? `Bàn ${order.tableCode}` : order.orderCode}
              </h2>
              <Badge className={`border ${statusMeta.badgeClassName}`}>{statusMeta.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
              <span>{order.orderCode}</span>
              <span className="text-[#c6a57f]">•</span>
              <span>Tạo lúc {formatDateTime(order.createdAt)}</span>
              <span className="text-[#c6a57f]">•</span>
              <span>Khách ngồi {formatElapsedFrom(seatAnchor)}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
          >
            Đóng
          </Button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto px-6 py-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="border-[#ead8c0] bg-white/85">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4e2916]">Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PAYMENT_METHODS.map((method) => {
                  const active = payMethod === method.key;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      disabled={!method.enabled}
                      onClick={() => setPayMethod(method.key)}
                      className={[
                        "w-full rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition",
                        active
                          ? "border-[#c74632] bg-[#fff0eb] text-[#8f2d1f] shadow-[0_12px_30px_-24px_rgba(146,45,28,0.9)]"
                          : "border-[#ead8c0] bg-[#fffaf3] text-[#6d4928] hover:bg-[#fff4e6]",
                        !method.enabled ? "cursor-not-allowed opacity-50" : "",
                      ].join(" ")}
                      title={!method.enabled ? "Hiện mới hỗ trợ settle cash trên backend" : ""}
                    >
                      {method.label}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-[#ead8c0] bg-white/85">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4e2916]">Tóm tắt bàn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#7a5a43]">
                <div className="flex items-center justify-between gap-3">
                  <span>Mở phiên lúc</span>
                  <span className="font-medium text-[#5a311b]">{formatDateTime(seatAnchor)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Tổng thời gian ngồi</span>
                  <span className="font-medium text-[#5a311b]">{formatElapsedFrom(seatAnchor)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Số món trên bill</span>
                  <span className="font-medium text-[#5a311b]">{order.totalItemCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Số loại món</span>
                  <span className="font-medium text-[#5a311b]">{order.uniqueItemCount ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8a684d]">Tổng thanh toán</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-[#4e2916]">
                  {total > 0 ? formatVnd(total) : "Chưa có"}
                </CardContent>
              </Card>

              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8a684d]">Đã nhận</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    value={String(received)}
                    inputMode="numeric"
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, "");
                      setReceived(digits ? Number(digits) : 0);
                    }}
                    className="h-11 border-[#dfc49f] bg-[#fffdfa] text-lg font-semibold text-[#4e2916]"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-[#7a5a43]">{formatVnd(received)}</div>
                    <button
                      type="button"
                      className="rounded-full border border-[#dfc49f] bg-[#fff8ed] px-3 py-1 text-xs font-semibold text-[#6a3b20] transition hover:bg-[#fff1df]"
                      onClick={() => setReceived(total)}
                    >
                      Đúng tiền
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8a684d]">Tiền thừa</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-[#4e2916]">
                  {total > 0 ? formatVnd(change) : "—"}
                </CardContent>
              </Card>

              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8a684d]">Giảm giá</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-[#4e2916]">
                  <div className="text-2xl font-semibold">
                    {order.discountAmount && order.discountAmount > 0 ? formatVnd(order.discountAmount) : "Không có"}
                  </div>
                  {order.voucherName || order.voucherCode ? (
                    <div className="text-sm text-[#7a5a43]">{order.voucherName || order.voucherCode}</div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {errorMessage ? (
              <Alert className="border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]">
                <AlertDescription>
                  {errorMessage}
                  {correlationId ? <span className="mt-1 block text-xs">Mã: {correlationId}</span> : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#4e2916]">Chi tiết đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.orderNote ? (
                    <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-3 text-sm text-[#7a5a43]">
                      Ghi chú khách: <span className="font-medium text-[#5a311b]">{order.orderNote}</span>
                    </div>
                  ) : null}

                  {order.items.length > 0 ? (
                    <div className="space-y-3">
                      {order.items.map((item) => {
                        const customization = summarizeItemCustomization(item.itemOptions ?? null);
                        return (
                          <div
                            key={item.orderItemId}
                            className="rounded-[20px] border border-[#ead7bb] bg-[#fffcf7] px-4 py-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20]">
                                    x{item.quantity}
                                  </Badge>
                                  <div className="text-base font-semibold text-[#4f2b18]">{item.itemName}</div>
                                </div>

                                {customization.chips.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {customization.chips.map((chip) => (
                                      <span
                                        key={`${item.orderItemId}:${chip}`}
                                        className="rounded-full border border-[#dfc49f]/75 bg-[#fff8ed] px-3 py-1 text-xs font-medium text-[#6e4424]"
                                      >
                                        {chip}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}

                                {customization.note ? (
                                  <div className="text-sm text-[#7a5a43]">
                                    Ghi chú món: <span className="font-medium text-[#5a311b]">{customization.note}</span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="text-right text-sm text-[#7a5a43]">
                                <div className="font-semibold text-[#5a311b]">
                                  {item.lineTotal > 0 ? formatVnd(item.lineTotal) : "—"}
                                </div>
                                {item.unitPrice > 0 ? <div>{formatVnd(item.unitPrice)} / món</div> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-[#ead7bb] bg-[#fffaf3] px-4 py-4 text-sm text-[#7a5a43]">
                      Đơn này chưa có snapshot item để hiển thị. Thu ngân vẫn có thể settle cash nếu nghiệp vụ cho phép, nhưng nên kiểm tra lại bill trước.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-5">
                <Card className="border-[#ead8c0] bg-white/90">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-[#4e2916]">Phím nhanh tiền nhận</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {quickAmounts.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {quickAmounts.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            className="rounded-[16px] border border-[#dfc49f] bg-[#fff9f0] px-3 py-3 text-sm font-semibold text-[#5a311b] transition hover:bg-[#fff2df]"
                            onClick={() => setReceived(amount)}
                          >
                            {formatVnd(amount)}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-4 gap-2">
                      {[7, 8, 9].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                          onClick={() => pressDigit(n)}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-sm font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                        onClick={backspace}
                      >
                        ⌫
                      </button>

                      {[4, 5, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                          onClick={() => pressDigit(n)}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-sm font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                        onClick={clear}
                      >
                        C
                      </button>

                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                          onClick={() => pressDigit(n)}
                        >
                          {n}
                        </button>
                      ))}
                      <div className="rounded-[16px] border border-dashed border-[#ead8c0] bg-[#fffaf3]" />

                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                        onClick={() => pressDigit(0)}
                      >
                        0
                      </button>
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                        onClick={press00}
                      >
                        00
                      </button>
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
                        onClick={press000}
                      >
                        000
                      </button>
                      <div className="rounded-[16px] border border-dashed border-[#ead8c0] bg-[#fffaf3]" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#ead8c0] bg-white/90">
                  <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#4e2916]">Xác nhận thu tiền</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${settlementTone}`}>
                    {settlementMessage}
                  </div>

                  <div className="text-sm leading-6 text-[#7a5a43]">
                    Thu ngân đang settle bằng <span className="font-semibold text-[#5a311b]">tiền mặt</span>. Khi xác nhận thành công, order sẽ được đánh dấu đã thanh toán và biến mất khỏi danh sách chờ.
                  </div>

                  <Button
                      type="button"
                      disabled={!canConfirm}
                      onClick={() => onConfirm(order.orderCode)}
                      className="h-14 w-full rounded-[18px] border border-[#0f8d3e] bg-[linear-gradient(180deg,#23b14b_0%,#15873a_100%)] text-base font-semibold text-white shadow-[0_20px_40px_-26px_rgba(13,107,44,0.85)] hover:brightness-105"
                    >
                      {isPending ? "Đang thanh toán..." : "Xác nhận thanh toán"}
                    </Button>

                    <div className="text-xs text-[#8a684d]">
                      Hiện chỉ hỗ trợ <span className="font-semibold text-[#5a311b]">Tiền mặt</span> qua API `settle-cash`.
                    </div>

                    {!canConfirm && total > 0 && missing > 0 ? (
                      <div className="text-xs text-[#8f2f2f]">
                        Chưa thể xác nhận vì còn thiếu {formatVnd(missing)}.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
