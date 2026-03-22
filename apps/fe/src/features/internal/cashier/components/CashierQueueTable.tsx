import { Badge } from "../../../../shared/ui/badge";
import { cn } from "../../../../shared/utils/cn";
import type { CashierOrderRow } from "../services/cashierQueueApi";
import {
  formatDateTime,
  formatElapsedFrom,
  formatVnd,
  getCashierStatusMeta,
  getCashierTotal,
  getSeatAnchor,
} from "../utils/cashierDisplay";

function isOverdue(row: CashierOrderRow): boolean {
  const anchor = getSeatAnchor(row);
  if (!anchor) return false;
  const ts = Date.parse(anchor);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts >= 15 * 60_000;
}

function formatShortTime(value?: string | null): string {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "—";
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type CashierQueueTableProps = {
  rows: CashierOrderRow[];
  selectedOrderCode: string | null;
  settlingOrderCode: string | null;
  recentlyUpdatedOrderCodes: Set<string>;
  onSelect: (orderCode: string) => void;
};

export function CashierQueueTable({
  rows,
  selectedOrderCode,
  settlingOrderCode,
  recentlyUpdatedOrderCodes,
  onSelect,
}: CashierQueueTableProps) {
  const queueGridClass =
    "grid min-w-[720px] grid-cols-[minmax(220px,1.45fr)_88px_88px_132px_108px] gap-4";

  return (
    <div className="min-w-0 overflow-hidden rounded-[28px] border border-[#ead8c0] bg-white shadow-[0_20px_40px_-32px_rgba(60,29,9,0.34)]">
      <div className="border-b border-[#efe1cf] bg-[#fffbf5] px-5 py-4">
        <div className="overflow-x-auto">
          <div
            className={cn(
              queueGridClass,
              "text-xs font-medium uppercase tracking-[0.16em] text-[#9f7751]",
            )}
          >
          <div>Giao dịch</div>
          <div>Giờ tạo</div>
          <div>Cập nhật</div>
          <div>Tổng thu</div>
          <div className="text-right">Xử lý</div>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-340px)] overflow-auto">
        <div className="min-w-[720px]">
          {rows.map((row) => {
            const statusMeta = getCashierStatusMeta(row.orderStatus);
            const total = getCashierTotal(row);
            const overdue = isOverdue(row);
            const recentlyUpdated = recentlyUpdatedOrderCodes.has(row.orderCode);
            const selected = selectedOrderCode === row.orderCode;
            const settling = settlingOrderCode === row.orderCode;
            const preview = (row.items ?? [])
              .slice(0, 2)
              .map((item) => item.itemName)
              .join(", ");

            return (
              <button
                key={row.orderCode}
                type="button"
                onClick={() => onSelect(row.orderCode)}
                className={cn(
                  queueGridClass,
                  "w-full items-start border-b border-[#f2e7d8] px-5 py-4 text-left transition last:border-b-0 xl:items-center",
                  selected ? "bg-[#fff6ea]" : "bg-white hover:bg-[#fffaf2]",
                  settling ? "pointer-events-none opacity-70" : "",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        overdue ? "bg-[#d07f28]" : recentlyUpdated ? "bg-[#3d9b8f]" : "bg-[#d9c2a7]",
                      )}
                    />
                    <span className="font-semibold text-[#4e2916]">{row.orderCode}</span>
                    <Badge className={cn("border", statusMeta.badgeClassName)}>{statusMeta.label}</Badge>
                    {overdue ? (
                      <Badge variant="outline" className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
                        Quá 15 phút
                      </Badge>
                    ) : null}
                    {recentlyUpdated ? (
                      <Badge variant="outline" className="border-[#b6d9d4] bg-[#edf9f7] text-[#2d6d66]">
                        Vừa thay đổi
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
                    <span>
                      Bàn{" "}
                      <span className="font-mono font-semibold text-[#5a311b]">
                        {row.tableCode ?? "—"}
                      </span>
                    </span>
                    <span className="text-[#ccb08f]">•</span>
                    <span>Khách ngồi {formatElapsedFrom(getSeatAnchor(row))}</span>
                    <span className="text-[#ccb08f]">•</span>
                    <span>Dùng tại quán</span>
                  </div>

                  <div
                    className="mt-2 truncate text-sm text-[#8a684d]"
                    title={preview || row.orderNote || ""}
                  >
                    {preview || row.orderNote || "Chưa có preview món trong đơn."}
                  </div>
                </div>

                <div className="text-sm text-[#6d4928]">{formatShortTime(row.createdAt)}</div>
                <div className="text-sm text-[#6d4928]">{formatShortTime(row.updatedAt ?? row.createdAt)}</div>
                <div>
                  <div className="font-semibold text-[#4f2b18]">
                    {total > 0 ? formatVnd(total) : "—"}
                  </div>
                  <div className="mt-1 text-xs text-[#8a684d]">{formatDateTime(row.createdAt)}</div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      settling
                        ? "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]"
                        : selected
                          ? "border-[#d9bd95] bg-[#fff1df] text-[#6a3b20]"
                          : "border-[#ead8c0] bg-[#fffaf3] text-[#7a5a43]",
                    )}
                  >
                    {settling ? "Đang settle" : selected ? "Đang mở" : "Mở xử lý"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
