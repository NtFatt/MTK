import type { Order } from "../types";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

type OrderTimelineProps = {
  order: Order;
};

export function OrderTimeline({ order }: OrderTimelineProps) {
  const status = order.status ?? "PENDING";
  const updatedAt = order.updatedAt ?? order.createdAt;

  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        Trạng thái hiện tại: <span className="font-medium text-foreground">{status}</span>
      </p>
      {updatedAt && (
        <p className="text-xs">Cập nhật: {formatDate(updatedAt)}</p>
      )}
    </div>
  );
}
