import { useState } from "react";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { cn } from "../../../../shared/utils/cn";
import { summarizeItemCustomization } from "../../../customer/shared/itemCustomization";
import type { AdminOrderStatus } from "../services/adminOrderApi";
import type { KitchenQueueRow } from "../services/kitchenQueueApi";

function normStatus(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function formatElapsed(iso?: string): string {
  if (!iso) return "Không rõ";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Không rõ";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "Không rõ";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "Không rõ";
  return new Date(ts).toLocaleString("vi-VN");
}

function getStatusMeta(status: string) {
  const normalized = normStatus(status);
  if (normalized === "NEW") {
    return {
      label: "Mới vào",
      badgeClassName: "border-[#f1d7a2] bg-[#fff3d6] text-[#8f5b17]",
      accentClassName: "border-l-[#efb34c]",
    };
  }
  if (normalized === "RECEIVED") {
    return {
      label: "Đã nhận",
      badgeClassName: "border-[#f4c09c] bg-[#fff0e4] text-[#b26023]",
      accentClassName: "border-l-[#e48d42]",
    };
  }
  if (normalized === "PREPARING") {
    return {
      label: "Đang chế biến",
      badgeClassName: "border-[#f1b3b3] bg-[#fff0f0] text-[#b13c3c]",
      accentClassName: "border-l-[#d75050]",
    };
  }
  if (normalized === "READY") {
    return {
      label: "Sẵn sàng",
      badgeClassName: "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]",
      accentClassName: "border-l-[#7cad54]",
    };
  }

  return {
    label: normalized || "UNKNOWN",
    badgeClassName: "border-border bg-background text-foreground",
    accentClassName: "border-l-border",
  };
}

function getKitchenAction(status: string): { to: AdminOrderStatus; label: string } | null {
  const normalized = normStatus(status);
  if (normalized === "NEW") return { to: "RECEIVED", label: "Nhận đơn" };
  if (normalized === "RECEIVED") return { to: "PREPARING", label: "Bắt đầu chế biến" };
  if (normalized === "PREPARING") return { to: "READY", label: "Đánh dấu sẵn sàng" };
  return null;
}

type KitchenOrderCardProps = {
  row: KitchenQueueRow;
  pending: boolean;
  canChangeStatus: boolean;
  onAdvance: (orderCode: string, toStatus: AdminOrderStatus) => void;
};

export function KitchenOrderCard({
  row,
  pending,
  canChangeStatus,
  onAdvance,
}: KitchenOrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = getStatusMeta(row.orderStatus);
  const action = getKitchenAction(row.orderStatus);
  const items = row.items ?? [];
  const visibleItems = expanded ? items : items.slice(0, 3);
  const missingRecipeCount = items.filter((item) => !item.recipeConfigured).length;
  const totalItemCount = row.totalItemCount ?? items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueItemCount = row.uniqueItemCount ?? items.length;
  const recipeSummaryLabel =
    items.length === 0 ? "Chưa có món" : missingRecipeCount > 0 ? `${missingRecipeCount} thiếu` : "Đã đủ";

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
            <div className="text-xs uppercase tracking-[0.24em] text-[#9f7751]">Ticket bếp</div>
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
              Chờ {formatElapsed(row.createdAt)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf3] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9f7751]">Tổng món</div>
            <div className="mt-2 text-2xl font-semibold text-[#4f2b18]">{totalItemCount}</div>
          </div>

          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf3] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9f7751]">Loại món</div>
            <div className="mt-2 text-2xl font-semibold text-[#4f2b18]">{uniqueItemCount}</div>
          </div>

          <div className="rounded-2xl border border-[#ead7bb] bg-[#fffaf3] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9f7751]">Recipe</div>
            <div className={cn("mt-2 text-2xl font-semibold", missingRecipeCount > 0 ? "text-[#b13c3c]" : "text-[#44723b]")}>
              {recipeSummaryLabel}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <Alert className="border-[#ead8c0] bg-[#fff8ed] text-[#6d4928]">
            <AlertDescription>
              Ticket này chưa có dòng món nào trong snapshot order. Bếp có thể chờ cashier/customer đồng bộ lại trước khi thao tác tiếp.
            </AlertDescription>
          </Alert>
        ) : null}

        {row.orderNote ? (
          <Alert className="border-[#ead8c0] bg-[#fffaf2] text-[#6d4928]">
            <AlertDescription>
              Ghi chú khách: <span className="font-medium text-[#5a311b]">{row.orderNote}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        {missingRecipeCount > 0 ? (
          <Alert className="border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]">
            <AlertDescription>
              Có {missingRecipeCount} món chưa có công thức nguyên liệu đầy đủ. Bếp vẫn nhìn được món khách đặt, nhưng cần bổ sung recipe để vận hành chuẩn.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          {visibleItems.map((item) => {
            const customization = summarizeItemCustomization(item.itemOptions ?? null);

            return (
              <div key={item.orderItemId} className="rounded-[22px] border border-[#ead7bb] bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20]">
                        x{item.quantity}
                      </Badge>
                      <div className="text-lg font-semibold text-[#4e2916]">{item.itemName}</div>
                    </div>

                    {customization.chips.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {customization.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-[#dfc49f]/75 bg-[#fff8ed] px-3 py-1 text-xs font-medium text-[#6e4424]"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {customization.note ? (
                      <div className="rounded-[16px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-3 py-2 text-sm text-[#7a5a43]">
                        Ghi chú: <span className="font-medium text-[#5a311b]">{customization.note}</span>
                      </div>
                    ) : null}
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      item.recipeConfigured
                        ? "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]"
                        : "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]",
                    )}
                  >
                    {item.recipeConfigured ? "Có công thức" : "Thiếu công thức"}
                  </Badge>
                </div>

                {item.recipe.length > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {item.recipe.map((ingredient) => (
                      <div
                        key={`${item.orderItemId}:${ingredient.ingredientId}`}
                        className="rounded-[18px] border border-[#efe0c6] bg-[#fffcf7] px-3 py-2 text-sm text-[#6d4928]"
                      >
                        <div className="font-medium text-[#4f2b18]">{ingredient.ingredientName}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#9f7751]">
                          {ingredient.qtyPerItem} {ingredient.unit} / 1 món
                        </div>
                        <div className="mt-1 text-sm text-[#7a5a43]">
                          Tổng ticket:{" "}
                          <span className="font-medium text-[#5a311b]">
                            {ingredient.qtyPerItem * item.quantity} {ingredient.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {items.length > 3 ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-4 py-2 text-sm font-medium text-[#6a3b20] transition hover:bg-[#fff2df]"
          >
            {expanded ? "Rút gọn danh sách món" : `Xem thêm ${items.length - 3} món`}
          </button>
        ) : null}

        {action && canChangeStatus ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ead7bb] pt-4">
            <div className="text-sm text-[#7a5a43]">
              {action.to === "RECEIVED"
                ? "Nhận ticket để xác nhận bếp đã tiếp nhận đơn này."
                : action.to === "PREPARING"
                  ? "Chuyển sang chế biến khi đã đủ nguyên liệu và sẵn sàng lên bếp."
                  : "Đánh dấu xong để phục vụ/coordinator nhận món."}
            </div>

            <Button
              onClick={() => onAdvance(row.orderCode, action.to)}
              disabled={pending}
              className="rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
            >
              {pending ? "Đang xử lý..." : action.label}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
