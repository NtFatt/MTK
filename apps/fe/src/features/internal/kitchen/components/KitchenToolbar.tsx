import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import type { KitchenDensity, KitchenViewMode } from "../hooks/useKitchenFilters";

type KitchenToolbarProps = {
  branchId: string;
  connectionStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
  lastSyncedAt: string | null;
  lastEventAt: string | null;
  isFetching: boolean;
  viewMode: KitchenViewMode;
  density: KitchenDensity;
  onRefresh: () => void;
  onViewModeChange: (value: KitchenViewMode) => void;
  onDensityChange: (value: KitchenDensity) => void;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "Chưa đồng bộ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Chưa đồng bộ";
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getRealtimeMeta(status: KitchenToolbarProps["connectionStatus"]) {
  if (status === "CONNECTED") {
    return {
      label: "Realtime ổn định",
      badgeClassName: "border-[#b6d9d4] bg-[#edf9f7] text-[#2d6d66]",
    };
  }
  if (status === "CONNECTING") {
    return {
      label: "Đang nối lại",
      badgeClassName: "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]",
    };
  }
  return {
    label: "Realtime suy giảm",
    badgeClassName: "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]",
  };
}

export function KitchenToolbar({
  branchId,
  connectionStatus,
  lastSyncedAt,
  lastEventAt,
  isFetching,
  viewMode,
  density,
  onRefresh,
  onViewModeChange,
  onDensityChange,
}: KitchenToolbarProps) {
  const realtimeMeta = getRealtimeMeta(connectionStatus);

  return (
    <section className="rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ee_100%)] px-6 py-5 shadow-[0_20px_40px_-32px_rgba(60,29,9,0.34)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">
            Kitchen display system
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-[#4e2916]">Bảng điều phối bếp chi nhánh {branchId}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#7a5a43]">
              <span>Sync {formatDateTime(lastSyncedAt)}</span>
              <span className="text-[#ccb08f]">•</span>
              <span>Event {formatDateTime(lastEventAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border px-3 py-1 text-xs font-semibold", realtimeMeta.badgeClassName)}>
            {realtimeMeta.label}
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            className="rounded-full border-[#d9bd95] bg-white/85 text-[#6a3b20]"
          >
            {isFetching ? "Đang làm mới..." : "Làm mới cứng"}
          </Button>
          <div className="rounded-full border border-[#ead8c0] bg-white/80 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("board")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                viewMode === "board"
                  ? "bg-[#fff0db] text-[#6a3b20] shadow-sm"
                  : "text-[#8a684d] hover:bg-[#fff7eb]",
              )}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                viewMode === "list"
                  ? "bg-[#fff0db] text-[#6a3b20] shadow-sm"
                  : "text-[#8a684d] hover:bg-[#fff7eb]",
              )}
            >
              List
            </button>
          </div>
          <div className="rounded-full border border-[#ead8c0] bg-white/80 p-1">
            <button
              type="button"
              onClick={() => onDensityChange("comfortable")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                density === "comfortable"
                  ? "bg-[#fff0db] text-[#6a3b20] shadow-sm"
                  : "text-[#8a684d] hover:bg-[#fff7eb]",
              )}
            >
              Rộng
            </button>
            <button
              type="button"
              onClick={() => onDensityChange("compact")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                density === "compact"
                  ? "bg-[#fff0db] text-[#6a3b20] shadow-sm"
                  : "text-[#8a684d] hover:bg-[#fff7eb]",
              )}
            >
              Gọn
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
