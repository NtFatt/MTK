import { Badge } from "../../../../shared/ui/badge";
import { cn } from "../../../../shared/utils/cn";
import { summarizeItemCustomization } from "../../../customer/shared/itemCustomization";
import type { KitchenDensity } from "../hooks/useKitchenFilters";
import type { KitchenQueueRow } from "../services/kitchenQueueApi";
import { formatKitchenAge, getKitchenSeverityMeta } from "../utils/kitchenSla";
import { getKitchenNextAction, getKitchenStatusMeta } from "../utils/kitchenStatus";

type KitchenTicketCardProps = {
  row: KitchenQueueRow;
  density: KitchenDensity;
  selected: boolean;
  recentlyUpdated: boolean;
  pendingStatus?: string;
  onSelect: (ticketKey: string) => void;
};

function formatShortTime(value?: string): string {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "—";
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KitchenTicketCard({
  row,
  density,
  selected,
  recentlyUpdated,
  pendingStatus,
  onSelect,
}: KitchenTicketCardProps) {
  const statusMeta = getKitchenStatusMeta(row.orderStatus);
  const severityMeta = getKitchenSeverityMeta(row);
  const nextAction = getKitchenNextAction(row.orderStatus);
  const items = row.items ?? [];
  const previewItems = items.slice(0, 3);
  const missingRecipeCount = items.filter((item) => !item.recipeConfigured).length;
  const customizationCount = items.reduce((count, item) => {
    const summary = summarizeItemCustomization(item.itemOptions ?? null);
    return count + summary.chips.length + Number(Boolean(summary.note));
  }, 0);
  const totalItemCount = row.totalItemCount ?? items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueItemCount = row.uniqueItemCount ?? items.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(String(row.ticketKey ?? row.orderCode))}
      className={cn(
        "w-full rounded-[26px] border text-left transition",
        density === "compact" ? "px-4 py-4" : "px-5 py-5",
        selected
          ? "border-[#d49c63] bg-[#fff3e4] shadow-[0_18px_36px_-28px_rgba(116,67,28,0.5)]"
          : "border-[#ead8c0] bg-white hover:bg-[#fffaf2]",
        severityMeta.cardClassName,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", statusMeta.dotClassName)} />
            <span className="truncate text-lg font-semibold text-[#4e2916]">{row.orderCode}</span>
            <Badge className={cn("border", statusMeta.badgeClassName)}>{statusMeta.label}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
            <span>
              Bàn{" "}
              <span className="font-mono font-semibold text-[#5a311b]">
                {row.tableCode ?? "—"}
              </span>
            </span>
            <span className="text-[#ccb08f]">•</span>
            <span>{formatShortTime(row.createdAt)}</span>
            <span className="text-[#ccb08f]">•</span>
            <span>{formatKitchenAge(row)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("border", severityMeta.badgeClassName)}>
            {severityMeta.label}
          </Badge>
          {recentlyUpdated ? (
            <Badge variant="outline" className="border-[#b6d9d4] bg-[#edf9f7] text-[#2d6d66]">
              Vừa cập nhật
            </Badge>
          ) : null}
          {pendingStatus ? (
            <Badge variant="outline" className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
              Đang chuyển {pendingStatus}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
        <span className="rounded-full border border-[#ead8c0] bg-[#fffaf3] px-3 py-1">
          {totalItemCount} món
        </span>
        <span className="rounded-full border border-[#ead8c0] bg-[#fffaf3] px-3 py-1">
          {uniqueItemCount} loại
        </span>
        {customizationCount > 0 ? (
          <span className="rounded-full border border-[#ead8c0] bg-[#fffaf3] px-3 py-1">
            {customizationCount} tùy chỉnh
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {missingRecipeCount > 0 ? (
            <Badge variant="outline" className="border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]">
              {missingRecipeCount} món thiếu recipe
            </Badge>
          ) : (
            <Badge variant="outline" className="border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]">
              Recipe đầy đủ
            </Badge>
          )}
          {nextAction ? (
            <span className="text-sm text-[#8a684d]">
              Bước tiếp theo: <span className="font-medium text-[#5a311b]">{nextAction.label}</span>
            </span>
          ) : null}
        </div>

        {row.orderNote ? (
          <div className="line-clamp-2 rounded-[16px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-3 py-2 text-sm text-[#7a5a43]">
            Ghi chú khách: <span className="font-medium text-[#5a311b]">{row.orderNote}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          {previewItems.map((item) => {
            const customization = summarizeItemCustomization(item.itemOptions ?? null);
            return (
              <div
                key={item.orderItemId}
                className="rounded-[16px] border border-[#efe0c6] bg-[#fffcf7] px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#4e2916]">
                      x{item.quantity} {item.itemName}
                    </div>
                    {customization.chips.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {customization.chips.slice(0, density === "compact" ? 2 : 3).map((chip) => (
                          <span
                            key={`${item.orderItemId}:${chip}`}
                            className="rounded-full border border-[#dfc49f]/75 bg-[#fff8ed] px-2 py-0.5 text-[11px] font-medium text-[#6e4424]"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-semibold",
                      item.recipeConfigured
                        ? "bg-[#eff9e8] text-[#44723b]"
                        : "bg-[#fff4f4] text-[#8f2f2f]",
                    )}
                  >
                    {item.recipeConfigured ? "OK" : "Thiếu"}
                  </span>
                </div>
                {customization.note ? (
                  <div className="mt-2 line-clamp-1 text-sm text-[#8a684d]">{customization.note}</div>
                ) : null}
              </div>
            );
          })}

          {items.length > previewItems.length ? (
            <div className="text-sm text-[#8a684d]">+{items.length - previewItems.length} món nữa trong ticket</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
