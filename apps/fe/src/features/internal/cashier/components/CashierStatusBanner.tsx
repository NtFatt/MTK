import type { SocketStatus } from "../../../../shared/realtime";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";

export type CashierFlashMessage = {
  tone: "success" | "warning";
  message: string;
};

type CashierStatusBannerProps = {
  connectionStatus: SocketStatus;
  lastError: string | null;
  selectedOrderCode: string | null;
  selectedOrderStale: boolean;
  flash: CashierFlashMessage | null;
};

export function CashierStatusBanner({
  connectionStatus,
  lastError,
  selectedOrderCode,
  selectedOrderStale,
  flash,
}: CashierStatusBannerProps) {
  return (
    <div className="space-y-3">
      {connectionStatus !== "CONNECTED" ? (
        <Alert className="border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]">
          <AlertDescription>
            Realtime đang degraded. Queue vẫn hoạt động qua refetch/polling an toàn.
            {lastError ? <span className="mt-1 block text-xs">Chi tiết: {lastError}</span> : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {selectedOrderStale && selectedOrderCode ? (
        <Alert className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
          <AlertDescription>
            Dữ liệu của đơn <span className="font-semibold">{selectedOrderCode}</span> vừa thay đổi.
            Workbench đang khóa xác nhận cho tới khi đồng bộ xong.
          </AlertDescription>
        </Alert>
      ) : null}

      {flash ? (
        <Alert
          className={
            flash.tone === "success"
              ? "border-[#b6d9c1] bg-[#eef8f1] text-[#25613d]"
              : "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]"
          }
        >
          <AlertDescription>{flash.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
