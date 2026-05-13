import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { CardContent } from "../../../../shared/ui/card";
import { cn } from "../../../../shared/utils/cn";
import { Skeleton } from "../../../../shared/ui/skeleton";
import type { ReservationAvailabilityResult } from "../services/reservationsApi";

type ReservationAvailabilityCardProps = {
  inputReady: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  data: ReservationAvailabilityResult | undefined;
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
};

function TableCard({
  table,
  isRecommended,
  isSelected,
  onClick,
}: {
  table: ReservationAvailabilityResult["availableTables"][number];
  isRecommended: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const seatFit = table.seats;
  const fitLabel =
    seatFit === 0 ? "Vừa khít" : `Dư ${seatFit} ghế`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-all duration-150",
        isSelected
          ? "border-[#5f7a35] bg-[#f0f7e6] shadow-[0_0_0_2px_#5f7a35]"
          : "border-[#d9bd95]/60 bg-[#fffaf3] hover:border-[#5f7a35]/50 hover:bg-[#f7fbf2]",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
            isSelected
              ? "bg-[#5f7a35] text-white"
              : "bg-[#5f7a35]/15 text-[#5f7a35]",
          )}
        >
          {table.tableCode}
        </div>
        <div>
          <div className="text-sm font-medium text-[#4e2916]">{table.tableCode}</div>
          <div className="text-xs text-[#7a5a43]">{table.areaName} · {table.seats} ghế</div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-[#7a5a43]">{fitLabel}</span>
        <div className="flex items-center gap-1">
          {isSelected && (
            <Badge className="bg-[#5f7a35] text-[8px] font-semibold uppercase tracking-wide">
              Đã chọn
            </Badge>
          )}
          {isRecommended && !isSelected && (
            <Badge className="bg-[#d34a34] text-[8px] font-semibold uppercase tracking-wide">
              Gợi ý
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

export function ReservationAvailabilityCard({
  inputReady,
  isLoading,
  errorMessage,
  data,
  selectedTableId,
  onSelectTable,
}: ReservationAvailabilityCardProps) {
  return (
    <div className="customer-hotpot-receipt rounded-[28px]">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <div className="customer-hotpot-kicker">Kiểm tra khả dụng</div>
          <div className="customer-mythmaker-title text-3xl text-[#4e2916]">Bàn còn trống không?</div>
          <p className="text-sm text-[#7a5a43]">
            Hệ thống sẽ kiểm tra số bàn còn trống theo khu vực, thời gian và số khách.
          </p>
        </div>

        {!inputReady ? (
          <div className="customer-hotpot-stat rounded-[22px] px-4 py-4 text-sm text-[#7a5a43]">
            Nhập đủ khu vực, số lượng khách và thời gian để kiểm tra bàn trống.
          </div>
        ) : null}

        {inputReady && isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-[22px]" />
            <Skeleton className="h-24 w-full rounded-[22px]" />
          </div>
        ) : null}

        {inputReady && errorMessage ? (
          <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {inputReady && !isLoading && !errorMessage && data ? (
          <>
            <div
              className={
                data.available
                  ? "customer-hotpot-stat rounded-[22px] px-4 py-4 text-[#5f7a35]"
                  : "customer-hotpot-stat rounded-[22px] px-4 py-4 text-[#a44b42]"
              }
            >
              <div className="text-sm font-medium">
                {data.available
                  ? "Có bàn phù hợp cho khung giờ này"
                  : "Hiện không còn bàn phù hợp"}
              </div>
              <div className="mt-1 text-sm">
                Số bàn khả dụng: <span className="font-semibold">{data.availableCount}</span>
              </div>
            </div>

            {data.unavailableReason && !data.available ? (
              <div className="rounded-[18px] border border-[#e4bfb4] bg-[#fff4ef] px-4 py-3 text-sm text-[#a44b42]">
                {data.unavailableReason}
              </div>
            ) : null}

            {data.availableTables.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-[#7a5a43]">
                  Bàn khả dụng ({data.availableTables.length})
                </div>
                {data.availableTables.map((table) => (
                  <TableCard
                    key={table.tableId}
                    table={table}
                    isRecommended={table.tableId === data.suggestedTable?.tableId}
                    isSelected={table.tableId === selectedTableId}
                    onClick={() => onSelectTable(table.tableId)}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </div>
  );
}
