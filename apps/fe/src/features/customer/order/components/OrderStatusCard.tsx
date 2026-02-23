import type { Order } from "../types";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

type OrderStatusCardProps = {
  order: Order;
};

export function OrderStatusCard({ order }: OrderStatusCardProps) {
  const status = order.status ?? "PENDING";
  const total = order.total ?? order.subtotal ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Đơn hàng {order.orderCode}</h1>
          <Badge variant="secondary">{status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Tạo lúc {formatDate(order.createdAt)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.items && order.items.length > 0 && (
          <ul className="space-y-2">
            {order.items.map((item) => {
              const price = item.unitPrice ?? 0;
              const lineTotal = price * item.qty;
              return (
                <li key={String(item.itemId)} className="flex justify-between text-sm">
                  <span>
                    {item.name ?? `Món #${item.itemId}`} × {item.qty}
                  </span>
                  <span>{formatVnd(lineTotal)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <span>Tổng cộng</span>
          <span>{formatVnd(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
