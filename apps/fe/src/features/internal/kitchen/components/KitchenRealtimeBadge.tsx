import type { SocketStatus } from "../../../../shared/realtime";
import { Badge } from "../../../../shared/ui/badge";

function formatTime(value?: string | null): string {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "—";
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function KitchenRealtimeBadge({
  status,
  lastSyncedAt,
  lastError,
}: {
  status: SocketStatus;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}) {
  const tone =
    status === "CONNECTED"
      ? "border-[#b6d9d4] bg-[#edf9f7] text-[#2d6d66]"
      : status === "CONNECTING"
        ? "border-[#d3d9ef] bg-[#eff4ff] text-[#355b9c]"
        : "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]";

  const label =
    status === "CONNECTED"
      ? "Realtime ổn định"
      : status === "CONNECTING"
        ? "Đang kết nối"
        : "Realtime degraded";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge className={`border ${tone}`}>{label}</Badge>
      <span className="text-[#7a5a43]">Sync gần nhất: {formatTime(lastSyncedAt)}</span>
      {lastError ? <span className="text-xs text-[#8b5a1d]">{lastError}</span> : null}
    </div>
  );
}
