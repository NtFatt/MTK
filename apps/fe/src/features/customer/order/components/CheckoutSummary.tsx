import type { Cart } from "../../cart/types";
import { Separator } from "../../../../shared/ui/separator";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getItemDisplayName(item: unknown): string {
  const record = item as Record<string, unknown>;

  const candidates = [
    record.name,
    record.itemName,
    record.menuItemName,
    record.productName,
    record.title,
    record.displayName,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const itemId = record.itemId;
  return typeof itemId === "string" || typeof itemId === "number"
    ? `Món #${itemId}`
    : "Món không xác định";
}

type CheckoutSummaryProps = {
  cart: Cart;
};

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const subtotal =
    cart.subtotal ??
    cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);

  const total = cart.total ?? subtotal;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {cart.items.map((item) => {
          const price = item.unitPrice ?? 0;
          const lineTotal = price * item.qty;
          const itemName = getItemDisplayName(item);

          return (
            <div
              key={String(item.itemId)}
              className="flex items-start justify-between gap-4 rounded-xl border bg-background/60 p-4"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {itemName}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatVnd(price)} × {item.qty}
                </div>
              </div>

              <div className="shrink-0 text-sm font-medium">
                {formatVnd(lineTotal)}
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tạm tính</span>
          <span>{formatVnd(subtotal)}</span>
        </div>

        {total !== subtotal && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tổng cộng</span>
            <span>{formatVnd(total)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-semibold">
          <span>Tổng thanh toán</span>
          <span>{formatVnd(total)}</span>
        </div>
      </div>
    </div>
  );
}