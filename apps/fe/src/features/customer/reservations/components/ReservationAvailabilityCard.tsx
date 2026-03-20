import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { CardContent } from "../../../../shared/ui/card";
import { Skeleton } from "../../../../shared/ui/skeleton";
import type { ReservationAvailabilityResult } from "../services/reservationsApi";

type ReservationAvailabilityCardProps = {
  inputReady: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  data: ReservationAvailabilityResult | undefined;
};

export function ReservationAvailabilityCard({
  inputReady,
  isLoading,
  errorMessage,
  data,
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
                {data.available ? "Có bàn phù hợp cho khung giờ này" : "Hiện không còn bàn phù hợp"}
              </div>
              <div className="mt-1 text-sm">
                Số bàn khả dụng: <span className="font-semibold">{data.availableCount}</span>
              </div>
            </div>

            {data.suggestedTable ? (
              <div className="customer-hotpot-stat rounded-[22px] px-4 py-4 text-sm">
                <div className="font-medium text-[#4e2916]">Bàn gợi ý</div>
                <div className="mt-3 grid gap-2 text-[#7a5a43]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Mã bàn</span>
                    <span className="font-mono font-semibold text-[#5a301a]">{data.suggestedTable.tableCode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Khu vực</span>
                    <span className="font-medium text-[#5a301a]">{data.suggestedTable.areaName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Số ghế</span>
                    <span className="font-medium text-[#5a301a]">{data.suggestedTable.seats}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </div>
  );
}
