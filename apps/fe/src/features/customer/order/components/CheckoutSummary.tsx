import type { Cart } from "../../cart/types";
import { Separator } from "../../../../shared/ui/separator";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

type CheckoutSummaryProps = {
  cart: Cart;
};

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const subtotal =
    cart.subtotal ?? cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const total = cart.total ?? subtotal;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {cart.items.map((item) => {
          const price = item.unitPrice ?? 0;
          const lineTotal = price * item.qty;
          return (
            <li key={String(item.itemId)} className="flex justify-between text-sm">
              <span className="text-foreground">
                {item.name ?? `Món #${item.itemId}`} × {item.qty}
              </span>
              <span>{formatVnd(lineTotal)}</span>
            </li>
          );
        })}
      </ul>
      <Separator />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tạm tính</span>
        <span>{formatVnd(subtotal)}</span>
      </div>
      {total !== subtotal && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tổng cộng</span>
          <span className="font-medium">{formatVnd(total)}</span>
        </div>
      )}
      <div className="flex justify-between font-medium">
        <span>Tổng thanh toán</span>
        <span>{formatVnd(total)}</span>
      </div>
    </div>
  );
}
