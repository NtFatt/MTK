import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { cn } from "../../../../shared/utils/cn";
import { summarizeItemCustomization } from "../../../customer/shared/itemCustomization";
import type { CashierOrderRow } from "../services/cashierQueueApi";
import {
  formatDateTime,
  formatElapsedFrom,
  formatVnd,
  getCashierStatusMeta,
  getCashierTotal,
  getSeatAnchor,
} from "../utils/cashierDisplay";

type CashierOrderCardProps = {
  row: CashierOrderRow;
  pending: boolean;
  canSettle: boolean;
  onOpen: (row: CashierOrderRow) => void;
};

export function CashierOrderCard({
  row,
  pending,
  canSettle,
  onOpen,
}: CashierOrderCardProps) {
  const statusMeta = getCashierStatusMeta(row.orderStatus);
  const items = row.items ?? [];
  const previewItems = items.slice(0, 3);
  const hiddenCount = Math.max(0, items.length - previewItems.length);
  const total = getCashierTotal(row);
  const seatAnchor = getSeatAnchor(row);

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] shadow-[0_18px_36px_-28px_rgba(60,29,9,0.38)]",
        statusMeta.accentClassName,
      )}
    >
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.24em] text-[#9f7751]">Thu ngân</div>
            <CardTitle className="text-xl font-semibold text-[#4e2916]">{row.orderCode}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
              <span>
                Bàn: <span className="font-mono font-semibold text-[#5a301a]">{row.tableCode ?? "—"}</span>
              </span>
              <span className="text-[#c6a57f]">•</span>
              <span>Tạo lúc {formatDateTime(row.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border", statusMeta.badgeClassName)}>{statusMeta.label}</Badge>
            <Badge variant="outline" className="border-[#dcc7a9] bg-[#fff8ed] text-[#6d4928]">
              Khách ngồi {formatElapsedFrom(seatAnchor)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf3] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9f7751]">Tổng thanh toán</div>
            <div className="mt-2 text-2xl font-semibold text-[#4f2b18]">
              {total > 0 ? formatVnd(total) : "Chưa có"}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf3] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9f7751]">Tổng món</div>
            <div className="mt-2 text-2xl font-semibold text-[#4f2b18]">{row.totalItemCount ?? 0}</div>
          </div>

          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf3] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9f7751]">Loại món</div>
            <div className="mt-2 text-2xl font-semibold text-[#4f2b18]">{row.uniqueItemCount ?? 0}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-[22px] border border-[#ead7bb] bg-white px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[#4e2916]">Món khách đã gọi</div>
            {row.voucherName || row.voucherCode ? (
              <Badge variant="outline" className="border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20]">
                Voucher: {row.voucherName || row.voucherCode}
              </Badge>
            ) : null}
          </div>

          {previewItems.length > 0 ? (
            <div className="mt-3 space-y-3">
              {previewItems.map((item) => {
                const customization = summarizeItemCustomization(item.itemOptions ?? null);
                return (
                  <div key={item.orderItemId} className="rounded-[18px] border border-[#efe0c6] bg-[#fffcf7] px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20]">
                          x{item.quantity}
                        </Badge>
                        <div className="font-medium text-[#4f2b18]">{item.itemName}</div>
                      </div>
                      {item.lineTotal > 0 ? (
                        <div className="text-sm font-semibold text-[#5a311b]">{formatVnd(item.lineTotal)}</div>
                      ) : null}
                    </div>

                    {customization.chips.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
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
                  </div>
                );
              })}

              {hiddenCount > 0 ? (
                <div className="text-sm text-[#7a5a43]">Và còn {hiddenCount} món nữa trong phần chi tiết thanh toán.</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-sm text-[#7a5a43]">Chưa có dữ liệu món trong đơn này.</div>
          )}
        </div>

        {row.orderNote ? (
          <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-3 text-sm text-[#7a5a43]">
            Ghi chú khách: <span className="font-medium text-[#5a311b]">{row.orderNote}</span>
          </div>
        ) : null}

        {canSettle ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ead7bb] pt-4">
            <div className="text-sm text-[#7a5a43]">
              Mở chi tiết để kiểm tra thời gian khách ngồi, món đã gọi và xác nhận thu tiền ngay trên một màn.
            </div>

            <Button
              onClick={() => onOpen(row)}
              disabled={pending}
              className="rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
            >
              {pending ? "Đang xử lý..." : "Mở thanh toán"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
