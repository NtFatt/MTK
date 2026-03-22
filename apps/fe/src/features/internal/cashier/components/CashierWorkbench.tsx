import { useCallback, useEffect, useMemo, useState } from "react";

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
import { CashierNumpad } from "./CashierNumpad";

type CashierPaymentMethod = "CASH" | "SHOPEEPAY" | "VISA" | "MASTER" | "JCB" | "ATM" | "OTHER";

const PAYMENT_METHODS: Array<{ key: CashierPaymentMethod; label: string; enabled: boolean }> = [
  { key: "CASH", label: "Tiền mặt", enabled: true },
  { key: "SHOPEEPAY", label: "ShopeePay", enabled: false },
  { key: "VISA", label: "VISA", enabled: false },
  { key: "MASTER", label: "Master", enabled: false },
  { key: "JCB", label: "JCB", enabled: false },
  { key: "ATM", label: "ATM", enabled: false },
  { key: "OTHER", label: "Khác", enabled: false },
];

export type CashierActionTrace = {
  id: string;
  tone: "success" | "error";
  orderCode: string;
  message: string;
  ts: string;
  amount?: number;
  correlationId?: string | null;
  txnRef?: string | null;
};

type CashierWorkbenchProps = {
  order: CashierOrderRow | null;
  canSettle: boolean;
  disabledReason?: string | null;
  isPending: boolean;
  isRefreshing: boolean;
  selectedOrderStale: boolean;
  lastSyncedAt: string | null;
  errorMessage?: string | null;
  correlationId?: string | null;
  recentActions: CashierActionTrace[];
  onConfirm: (orderCode: string) => void;
  onClearSelection: () => void;
};

export function CashierWorkbench({
  order,
  canSettle,
  disabledReason,
  isPending,
  isRefreshing,
  selectedOrderStale,
  lastSyncedAt,
  errorMessage,
  correlationId,
  recentActions,
  onConfirm,
  onClearSelection,
}: CashierWorkbenchProps) {
  const total = getCashierTotal(order ?? {});
  const seatAnchor = getSeatAnchor(order ?? {});
  const statusMeta = getCashierStatusMeta(String(order?.orderStatus ?? ""));
  const editorScopeKey = order ? `${order.orderCode}:${order.updatedAt ?? ""}:${total}` : "none";
  const [editorState, setEditorState] = useState<{
    scopeKey: string;
    payMethod: CashierPaymentMethod;
    received: number;
  }>({
    scopeKey: "none",
    payMethod: "CASH",
    received: 0,
  });

  const effectiveEditorState =
    editorState.scopeKey === editorScopeKey
      ? editorState
      : {
          scopeKey: editorScopeKey,
          payMethod: "CASH" as CashierPaymentMethod,
          received: total || 0,
        };

  const payMethod = effectiveEditorState.payMethod;
  const received = effectiveEditorState.received;

  const updateEditorState = useCallback(
    (patch: Partial<typeof effectiveEditorState>) => {
      setEditorState((prev) => {
        const current =
          prev.scopeKey === editorScopeKey
            ? prev
            : {
                scopeKey: editorScopeKey,
                payMethod: "CASH" as CashierPaymentMethod,
                received: total || 0,
              };

        return {
          ...current,
          ...patch,
        };
      });
    },
    [editorScopeKey, total],
  );

  useEffect(() => {
    if (!order) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClearSelection();
        return;
      }

      if (
        event.key === "Enter" &&
        payMethod === "CASH" &&
        received >= total &&
        !selectedOrderStale &&
        !isPending
      ) {
        onConfirm(order.orderCode);
        return;
      }

      if (/^\d$/.test(event.key)) {
        updateEditorState({ received: received * 10 + Number(event.key) });
        return;
      }

      if (event.key === "Backspace") {
        updateEditorState({ received: Math.floor(received / 10) });
        return;
      }

      if (event.key === "Delete") {
        updateEditorState({ received: 0 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isPending,
    onClearSelection,
    onConfirm,
    order,
    payMethod,
    received,
    selectedOrderStale,
    total,
    updateEditorState,
  ]);

  const quickAmounts = useMemo(() => {
    if (!total) return [];
    return Array.from(
      new Set([total, roundUp(total, 1000), roundUp(total, 5000), roundUp(total, 10000), roundUp(total, 50000)]),
    )
      .filter((value) => value > 0)
      .sort((left, right) => left - right);
  }, [total]);

  if (!order) {
    return (
      <div className="min-w-0 rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ee_100%)] p-6 shadow-[0_20px_40px_-32px_rgba(60,29,9,0.34)] min-[1800px]:sticky min-[1800px]:top-4">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Settlement workbench</div>
          <h2 className="text-2xl font-semibold text-[#4e2916]">Chọn một bill để mở khu vực thu tiền</h2>
          <div className="rounded-[22px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-5 py-5 text-sm leading-6 text-[#7a5a43]">
            Bên trái là filter, giữa là queue xử lý. Khi bấm vào một dòng, toàn bộ thông tin bill, món ăn, tiền nhận và xác nhận settle cash sẽ hiện ở đây.
          </div>
        </div>
      </div>
    );
  }

  const missing = Math.max(0, total - received);
  const change = Math.max(0, received - total);
  const canConfirm =
    canSettle &&
    !disabledReason &&
    payMethod === "CASH" &&
    (total === 0 || received >= total) &&
    !isPending &&
    !selectedOrderStale;

  const settlementTone =
    total === 0
      ? "border-[#d9bd95] bg-[#fff8ec] text-[#6a3b20]"
      : missing > 0
        ? "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]"
        : change > 0
          ? "border-[#b4dec4] bg-[#edf8f1] text-[#1c7c44]"
          : "border-[#e6d8c4] bg-[#fff8ef] text-[#876341]";

  return (
    <div className="min-w-0 space-y-4 min-[1800px]:sticky min-[1800px]:top-4">
      <section className="rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ee_100%)] shadow-[0_20px_40px_-32px_rgba(60,29,9,0.34)]">
        <div className="border-b border-[#efe1cf] px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Settlement workbench</div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-[#4e2916]">
                  {order.tableCode ? `Bàn ${order.tableCode}` : order.orderCode}
                </h2>
                <Badge className={`border ${statusMeta.badgeClassName}`}>{statusMeta.label}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
                <span>{order.orderCode}</span>
                <span className="text-[#ccb08f]">•</span>
                <span>Tạo lúc {formatDateTime(order.createdAt)}</span>
                <span className="text-[#ccb08f]">•</span>
                <span>Khách ngồi {formatElapsedFrom(seatAnchor)}</span>
                {lastSyncedAt ? (
                  <>
                    <span className="text-[#ccb08f]">•</span>
                    <span>Sync {formatDateTime(lastSyncedAt)}</span>
                  </>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onClearSelection}
              disabled={isPending}
              className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
            >
              Hủy chọn
            </Button>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6">
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
                      onClick={() => updateEditorState({ payMethod: method.key })}
                      className={[
                        "w-full rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition",
                        active
                          ? "border-[#c74632] bg-[#fff0eb] text-[#8f2d1f] shadow-[0_12px_30px_-24px_rgba(146,45,28,0.9)]"
                          : "border-[#ead8c0] bg-[#fffaf3] text-[#6d4928] hover:bg-[#fff4e6]",
                        !method.enabled ? "cursor-not-allowed opacity-50" : "",
                      ].join(" ")}
                      title={!method.enabled ? "Chưa hỗ trợ trên backend" : ""}
                    >
                      {method.label}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-[#ead8c0] bg-white/85">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4e2916]">Tóm tắt bill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#7a5a43]">
                <div className="flex items-center justify-between gap-3">
                  <span>Tổng phải thu</span>
                  <span className="font-semibold text-[#5a311b]">
                    {total > 0 ? formatVnd(total) : "Chưa có"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Số món trên bill</span>
                  <span className="font-semibold text-[#5a311b]">{order.totalItemCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Số loại món</span>
                  <span className="font-semibold text-[#5a311b]">{order.uniqueItemCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Giảm giá</span>
                  <span className="font-semibold text-[#5a311b]">
                    {order.discountAmount && order.discountAmount > 0
                      ? formatVnd(order.discountAmount)
                      : "Không có"}
                  </span>
                </div>
                {order.voucherName || order.voucherCode ? (
                  <div className="rounded-[16px] border border-dashed border-[#dfc49f] bg-[#fffaf4] px-3 py-3 text-xs text-[#7a5a43]">
                    Voucher đang áp dụng:{" "}
                    <span className="font-semibold text-[#5a311b]">
                      {order.voucherName || order.voucherCode}
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            {selectedOrderStale ? (
              <Alert className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
                <AlertDescription>
                  Bill này vừa có thay đổi realtime.{" "}
                  {isRefreshing
                    ? "Hệ thống đang đồng bộ lại..."
                    : "Hãy kiểm tra lại trước khi xác nhận."}
                </AlertDescription>
              </Alert>
            ) : null}

            {errorMessage ? (
              <Alert className="border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]">
                <AlertDescription>
                  {errorMessage}
                  {correlationId ? (
                    <span className="mt-1 block text-xs">Mã: {correlationId}</span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            {disabledReason ? (
              <Alert className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
                <AlertDescription>{disabledReason}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 min-[1400px]:grid-cols-3">
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
                      updateEditorState({ received: digits ? Number(digits) : 0 });
                    }}
                    className="h-11 border-[#dfc49f] bg-[#fffdfa] text-lg font-semibold text-[#4e2916]"
                  />
                  <div className="text-sm text-[#7a5a43]">{formatVnd(received)}</div>
                </CardContent>
              </Card>

              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8a684d]">Thiếu / thừa</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-[#4e2916]">
                  {missing > 0
                    ? `Thiếu ${formatVnd(missing)}`
                    : change > 0
                      ? `Thừa ${formatVnd(change)}`
                      : "Đúng tiền"}
                </CardContent>
              </Card>

              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8a684d]">Tiền thừa</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-[#2d6d66]">
                  {total > 0 ? formatVnd(change) : "—"}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5">
              <Card className="border-[#ead8c0] bg-white/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#4e2916]">Chi tiết bill</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.orderNote ? (
                    <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-3 text-sm text-[#7a5a43]">
                      Ghi chú khách:{" "}
                      <span className="font-medium text-[#5a311b]">{order.orderNote}</span>
                    </div>
                  ) : null}

                  {order.items.length > 0 ? (
                    <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
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
                                  <Badge
                                    variant="outline"
                                    className="border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20]"
                                  >
                                    x{item.quantity}
                                  </Badge>
                                  <div className="text-base font-semibold text-[#4f2b18]">
                                    {item.itemName}
                                  </div>
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
                                    Ghi chú món:{" "}
                                    <span className="font-medium text-[#5a311b]">
                                      {customization.note}
                                    </span>
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
                    <CardTitle className="text-base text-[#4e2916]">Tiền khách đưa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fff9f0] px-3 py-3 text-sm font-semibold text-[#5a311b] transition hover:bg-[#fff2df]"
                        onClick={() => updateEditorState({ received: total })}
                      >
                        Đúng tiền
                      </button>
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fff9f0] px-3 py-3 text-sm font-semibold text-[#5a311b] transition hover:bg-[#fff2df]"
                        onClick={() => updateEditorState({ received: roundUp(total, 1000) })}
                      >
                        Làm tròn +1k
                      </button>
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fff9f0] px-3 py-3 text-sm font-semibold text-[#5a311b] transition hover:bg-[#fff2df]"
                        onClick={() => updateEditorState({ received: roundUp(total, 5000) })}
                      >
                        Làm tròn +5k
                      </button>
                      <button
                        type="button"
                        className="rounded-[16px] border border-[#dfc49f] bg-[#fff9f0] px-3 py-3 text-sm font-semibold text-[#5a311b] transition hover:bg-[#fff2df]"
                        onClick={() => updateEditorState({ received: roundUp(total, 10000) })}
                      >
                        Làm tròn +10k
                      </button>
                    </div>

                    {quickAmounts.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {quickAmounts.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            className="rounded-[16px] border border-[#dfc49f] bg-[#fff9f0] px-3 py-3 text-sm font-semibold text-[#5a311b] transition hover:bg-[#fff2df]"
                            onClick={() => updateEditorState({ received: amount })}
                          >
                            {formatVnd(amount)}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <CashierNumpad
                      onDigit={(digit) => updateEditorState({ received: received * 10 + digit })}
                      onDoubleZero={() => updateEditorState({ received: received * 100 })}
                      onTripleZero={() => updateEditorState({ received: received * 1000 })}
                      onBackspace={() => updateEditorState({ received: Math.floor(received / 10) })}
                      onClear={() => updateEditorState({ received: 0 })}
                    />
                  </CardContent>
                </Card>

                <Card className="border-[#ead8c0] bg-white/90">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-[#4e2916]">Xác nhận thu tiền</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${settlementTone}`}>
                      {total === 0
                        ? "Bill này chưa có tổng tiền hợp lệ. Thu ngân nên kiểm tra lại trước khi settle."
                        : missing > 0
                          ? `Khách còn thiếu ${formatVnd(missing)} để hoàn tất thanh toán.`
                          : change > 0
                            ? `Thu ngân cần thối lại ${formatVnd(change)} cho khách.`
                            : "Khách đã đưa đúng số tiền cần thanh toán."}
                    </div>

                    <div className="text-sm leading-6 text-[#7a5a43]">
                      Hiện chỉ hỗ trợ <span className="font-semibold text-[#5a311b]">Tiền mặt</span>.
                      Giao diện kiểm tra `Đã nhận / Tiền thừa` được dùng để thu ngân thao tác an toàn trước khi gọi `settle-cash`.
                    </div>

                    <Button
                      type="button"
                      disabled={!canConfirm}
                      onClick={() => onConfirm(order.orderCode)}
                      className="h-14 w-full rounded-[18px] border border-[#0f8d3e] bg-[linear-gradient(180deg,#23b14b_0%,#15873a_100%)] text-base font-semibold text-white shadow-[0_20px_40px_-26px_rgba(13,107,44,0.85)] hover:brightness-105"
                    >
                      {isPending ? "Đang thanh toán..." : "Xác nhận thanh toán"}
                    </Button>

                    {!canConfirm && disabledReason ? (
                      <div className="text-xs text-[#8b5a1d]">{disabledReason}</div>
                    ) : null}

                    {!canConfirm && !disabledReason && total > 0 && missing > 0 ? (
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
      </section>

      {recentActions.length > 0 ? (
        <Card className="border-[#ead8c0] bg-white/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#4e2916]">5 kết quả gần nhất trong phiên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActions.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#ead7bb] bg-[#fffcf7] px-4 py-3 text-sm"
              >
                <div className="space-y-1">
                  <div className="font-medium text-[#4e2916]">{entry.message}</div>
                  <div className="text-xs text-[#8a684d]">
                    {entry.orderCode} • {formatDateTime(entry.ts)}
                    {entry.correlationId ? ` • Mã ${entry.correlationId}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.amount ? (
                    <Badge
                      variant="outline"
                      className="border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20]"
                    >
                      {formatVnd(entry.amount)}
                    </Badge>
                  ) : null}
                  <Badge
                    className={
                      entry.tone === "success"
                        ? "border border-[#b6d9c1] bg-[#eef8f1] text-[#25613d]"
                        : "border border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]"
                    }
                  >
                    {entry.tone === "success" ? "SUCCESS" : "ERROR"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
