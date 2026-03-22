import { useMemo } from "react";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { summarizeItemCustomization } from "../../../customer/shared/itemCustomization";
import type { AdminOrderStatus } from "../services/adminOrderApi";
import type { KitchenQueueRow } from "../services/kitchenQueueApi";
import { type KitchenActionErrorState } from "../utils/kitchenErrors";
import { formatKitchenAge, getKitchenSeverityMeta } from "../utils/kitchenSla";
import { getKitchenNextAction, getKitchenStatusMeta } from "../utils/kitchenStatus";

export type KitchenActionTrace = {
  id: string;
  tone: "success" | "error";
  orderCode: string;
  message: string;
  ts: string;
  correlationId?: string | null;
};

type KitchenWorkbenchProps = {
  row: KitchenQueueRow | null;
  canChangeStatus: boolean;
  isRefreshing: boolean;
  selectedOrderStale: boolean;
  pendingStatus?: AdminOrderStatus;
  actionError: KitchenActionErrorState | null;
  onAdvance: (row: KitchenQueueRow, toStatus: AdminOrderStatus) => void;
  onAcknowledgeStale: () => void;
  onClearSelection: () => void;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "Không rõ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Không rõ";
  return new Date(ts).toLocaleString("vi-VN");
}

export function KitchenWorkbench({
  row,
  canChangeStatus,
  isRefreshing,
  selectedOrderStale,
  pendingStatus,
  actionError,
  onAdvance,
  onAcknowledgeStale,
  onClearSelection,
}: KitchenWorkbenchProps) {
  const recipeTotals = useMemo(() => {
    if (!row) return [];
    const totals = new Map<string, { ingredientName: string; unit: string; quantity: number }>();

    for (const item of row.items ?? []) {
      for (const line of item.recipe ?? []) {
        const current = totals.get(line.ingredientId);
        const quantity = line.qtyPerItem * item.quantity;
        if (current) {
          current.quantity += quantity;
        } else {
          totals.set(line.ingredientId, {
            ingredientName: line.ingredientName,
            unit: line.unit,
            quantity,
          });
        }
      }
    }

    return Array.from(totals.entries())
      .map(([ingredientId, value]) => ({ ingredientId, ...value }))
      .sort((left, right) => right.quantity - left.quantity);
  }, [row]);

  if (!row) {
    return (
      <div className="min-[1500px]:sticky min-[1500px]:top-4">
        <div className="flex max-h-[calc(100vh-32px)] min-h-[320px] flex-col overflow-hidden rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ee_100%)] shadow-[0_20px_40px_-32px_rgba(60,29,9,0.34)]">
          <div className="overflow-y-auto p-6">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Kitchen workbench</div>
              <h2 className="text-2xl font-semibold text-[#4e2916]">
                Chọn một ticket để mở khu vực thao tác bếp
              </h2>
              <div className="rounded-[22px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-5 py-5 text-sm leading-6 text-[#7a5a43]">
                Queue ở giữa dùng để nhìn và chọn ticket. Workbench này sẽ gom note khách,
                customizations, recipe totals và bước chuyển trạng thái hợp lệ để bếp thao tác ít nhầm hơn.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = getKitchenStatusMeta(row.orderStatus);
  const severityMeta = getKitchenSeverityMeta(row);
  const nextAction = getKitchenNextAction(row.orderStatus);
  const missingRecipeCount = (row.items ?? []).filter((item) => !item.recipeConfigured).length;
  const cannotPrepare = nextAction?.to === "PREPARING" && row.recipeConfigured === false;
  const actionDisabledReason = !canChangeStatus
    ? "Bạn không có quyền đổi trạng thái đơn trong khu bếp."
    : selectedOrderStale
      ? "Ticket này vừa đổi ở nơi khác. Hãy xác nhận lại trước khi thao tác."
      : cannotPrepare
        ? "Có món chưa có công thức, không nên bắt đầu chế biến ở bước này."
        : null;

  return (
    <div className="min-[1500px]:sticky min-[1500px]:top-4">
      <section className="flex max-h-[calc(100vh-32px)] min-h-[540px] flex-col overflow-hidden rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ee_100%)] shadow-[0_20px_40px_-32px_rgba(60,29,9,0.34)]">
        <div className="border-b border-[#efe1cf] px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Kitchen workbench</div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-[#4e2916]">{row.orderCode}</h2>
                <Badge className={`border ${statusMeta.badgeClassName}`}>{statusMeta.label}</Badge>
                <Badge variant="outline" className={`border ${severityMeta.badgeClassName}`}>
                  {severityMeta.label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
                <span>
                  Bàn{" "}
                  <span className="font-mono font-semibold text-[#5a311b]">
                    {row.tableCode ?? "—"}
                  </span>
                </span>
                <span className="text-[#ccb08f]">•</span>
                <span>Tạo lúc {formatDateTime(row.createdAt)}</span>
                <span className="text-[#ccb08f]">•</span>
                <span>Chờ {formatKitchenAge(row)}</span>
                <span className="text-[#ccb08f]">•</span>
                <span>Cập nhật {formatDateTime(row.updatedAt ?? row.createdAt)}</span>
              </div>
            </div>

            <div className="flex min-w-[220px] flex-col items-stretch gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {nextAction ? (
                  <Button
                    type="button"
                    onClick={() => onAdvance(row, nextAction.to)}
                    disabled={Boolean(actionDisabledReason) || Boolean(pendingStatus)}
                    className="h-11 rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] px-5 text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
                  >
                    {pendingStatus ? "Đang xử lý..." : nextAction.label}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearSelection}
                  disabled={Boolean(pendingStatus)}
                  className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                >
                  Hủy chọn
                </Button>
              </div>

              {nextAction && actionDisabledReason ? (
                <div className="text-right text-sm text-[#8f2f2f]">{actionDisabledReason}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-4">
          {selectedOrderStale ? (
            <Alert className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Ticket vừa có thay đổi realtime.{" "}
                  {isRefreshing ? "Hệ thống đang đồng bộ lại..." : "Hãy xem lại trước khi bấm bước tiếp theo."}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAcknowledgeStale}
                  className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                >
                  Đã xem thay đổi
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert className="border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]">
              <AlertDescription>
                {actionError.message}
                {actionError.correlationId ? (
                  <span className="mt-1 block text-xs">Mã yêu cầu: {actionError.correlationId}</span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-4">
            {!nextAction ? (
              <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
                Ticket này không còn bước hợp lệ nào trong phạm vi role bếp.
              </div>
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
                  Ticket này có {missingRecipeCount} món chưa đủ recipe. Khi bấm{" "}
                  <span className="font-medium">Bắt đầu chế biến</span>, backend có thể từ chối để bảo vệ inventory.
                </AlertDescription>
              </Alert>
            ) : null}

            <Card className="border-[#ead8c0] bg-white/85">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4e2916]">Món và tùy chỉnh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {(row.items ?? []).map((item) => {
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
                              <span className="text-lg font-semibold text-[#4e2916]">{item.itemName}</span>
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
                              <div className="rounded-[16px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-3 py-2 text-sm text-[#7a5a43]">
                                Ghi chú món: <span className="font-medium text-[#5a311b]">{customization.note}</span>
                              </div>
                            ) : null}
                          </div>

                          <Badge
                            variant="outline"
                            className={
                              item.recipeConfigured
                                ? "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]"
                                : "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]"
                            }
                          >
                            {item.recipeConfigured ? "Có recipe" : "Thiếu recipe"}
                          </Badge>
                        </div>

                        {item.recipe.length > 0 ? (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {item.recipe.map((line) => (
                              <div
                                key={`${item.orderItemId}:${line.ingredientId}`}
                                className="rounded-[18px] border border-[#efe0c6] bg-[#fffcf7] px-3 py-2 text-sm text-[#6d4928]"
                              >
                                <div className="font-medium text-[#4f2b18]">{line.ingredientName}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#9f7751]">
                                  {line.qtyPerItem} {line.unit} / 1 món
                                </div>
                                <div className="mt-1">
                                  Tổng ticket:{" "}
                                  <span className="font-medium text-[#5a311b]">
                                    {line.qtyPerItem * item.quantity} {line.unit}
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
              </CardContent>
            </Card>

            <Card className="border-[#ead8c0] bg-white/85">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4e2916]">Tổng nguyên liệu ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recipeTotals.length > 0 ? (
                  <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                    {recipeTotals.map((ingredient) => (
                      <div
                        key={ingredient.ingredientId}
                        className="flex items-center justify-between gap-3 rounded-[16px] border border-[#efe0c6] bg-[#fffcf7] px-3 py-3 text-sm text-[#6d4928]"
                      >
                        <span className="font-medium text-[#4f2b18]">{ingredient.ingredientName}</span>
                        <span className="font-semibold text-[#5a311b]">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
                    Chưa có snapshot recipe để cộng dồn nguyên liệu cho ticket này.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
