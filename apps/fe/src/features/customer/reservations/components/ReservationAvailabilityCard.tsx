import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
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
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Kiểm tra khả dụng</CardTitle>
        <p className="text-sm text-muted-foreground">
          Hệ thống sẽ kiểm tra số bàn còn trống theo khu vực, thời gian và số khách.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!inputReady && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Nhập đủ khu vực, số lượng khách và thời gian để kiểm tra bàn trống.
          </div>
        )}

        {inputReady && isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {inputReady && errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {inputReady && !isLoading && !errorMessage && data && (
          <>
            <div
              className={
                data.available
                  ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                  : "rounded-xl border border-destructive/30 bg-destructive/10 p-4"
              }
            >
              <div className="text-sm font-medium">
                {data.available
                  ? "Có bàn phù hợp cho khung giờ này"
                  : "Hiện không còn bàn phù hợp"}
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                Số bàn khả dụng:{" "}
                <span className="font-semibold text-foreground">{data.availableCount}</span>
              </div>
            </div>

            {data.suggestedTable && (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <div className="font-medium">Bàn gợi ý</div>
                <div className="mt-2 grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Mã bàn</span>
                    <span className="font-mono">{data.suggestedTable.tableCode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Khu vực</span>
                    <span className="font-medium">{data.suggestedTable.areaName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Số ghế</span>
                    <span className="font-medium">{data.suggestedTable.seats}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}