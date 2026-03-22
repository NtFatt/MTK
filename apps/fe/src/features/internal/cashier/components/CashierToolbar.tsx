import type { SocketStatus } from "../../../../shared/realtime";
import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

function formatSyncTime(value: string | null): string {
  if (!value) return "Chưa đồng bộ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Chưa đồng bộ";
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusMeta(status: SocketStatus) {
  if (status === "CONNECTED") {
    return {
      label: "Realtime ổn định",
      badgeClassName: "border-[#b6d9c1] bg-[#eef8f1] text-[#25613d]",
    };
  }

  if (status === "CONNECTING") {
    return {
      label: "Đang nối lại",
      badgeClassName: "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]",
    };
  }

  return {
    label: "Đang chạy fallback",
    badgeClassName: "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]",
  };
}

type CashierToolbarProps = {
  branchId: string;
  operatorName: string;
  connectionStatus: SocketStatus;
  lastSyncedAt: string | null;
  lastEventAt: string | null;
  isFetching: boolean;
  onRefresh: () => void;
};

export function CashierToolbar({
  branchId,
  operatorName,
  connectionStatus,
  lastSyncedAt,
  lastEventAt,
  isFetching,
  onRefresh,
}: CashierToolbarProps) {
  const statusMeta = getStatusMeta(connectionStatus);

  return (
    <section className="rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff4e8_100%)] px-6 py-5 shadow-[0_20px_40px_-32px_rgba(60,29,9,0.45)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">Cashier workstation</div>
          <h1 className="text-3xl font-semibold text-[#4e2916]">Bàn thu ngân chi nhánh {branchId}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a5a43]">
            <span>
              Thu ngân đang đăng nhập:{" "}
              <span className="font-semibold text-[#5a311b]">{operatorName}</span>
            </span>
            <span className="text-[#ccb08f]">•</span>
            <span>Lần sync gần nhất: {formatSyncTime(lastSyncedAt)}</span>
            {lastEventAt ? (
              <>
                <span className="text-[#ccb08f]">•</span>
                <span>Có event mới lúc {formatSyncTime(lastEventAt)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium",
              statusMeta.badgeClassName,
            )}
          >
            {statusMeta.label}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
          >
            {isFetching ? "Đang làm mới..." : "Làm mới cứng"}
          </Button>
        </div>
      </div>
    </section>
  );
}
