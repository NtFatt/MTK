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
  const subtotal = cart.subtotal ?? cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const discount = cart.discount ?? cart.voucher?.discountAmount ?? 0;
  const total = cart.total ?? subtotal;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {cart.items.map((item) => {
          const price = item.unitPrice ?? 0;
          const lineTotal = price * item.qty;
          const itemName = getItemDisplayName(item);

          return (
            <div
              key={String(item.itemId)}
              className="customer-hotpot-stat flex items-start justify-between gap-4 rounded-[22px] px-4 py-4"
            >
              <div className="min-w-0">
                <div className="customer-mythmaker-title truncate text-2xl text-[#4e2916]">
                  {itemName}
                </div>
                <div className="mt-2 text-sm text-[#7a5a43]">
                  {formatVnd(price)} × {item.qty}
                </div>
              </div>

              <div className="shrink-0 text-sm font-semibold text-[#c43c2d]">{formatVnd(lineTotal)}</div>
            </div>
          );
        })}
      </div>

      <Separator className="bg-[#e0c49d]/70" />

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-[#7a5a43]">
          <span>Tạm tính</span>
          <span className="font-medium text-[#5d341b]">{formatVnd(subtotal)}</span>
        </div>

        {discount > 0 ? (
          <div className="flex justify-between text-sm text-[#7a5a43]">
            <span>
              {cart.voucher?.code ? `Voucher ${cart.voucher.code}` : "Giảm giá"}
            </span>
            <span className="font-medium text-[#c43c2d]">-{formatVnd(discount)}</span>
          </div>
        ) : null}

        {total !== subtotal ? (
          <div className="flex justify-between text-sm text-[#7a5a43]">
            <span>Tổng cộng</span>
            <span className="font-medium text-[#5d341b]">{formatVnd(total)}</span>
          </div>
        ) : null}

        <div className="flex justify-between text-lg font-semibold text-[#4b2817]">
          <span>Tổng thanh toán</span>
          <span className="text-[#c43c2d]">{formatVnd(total)}</span>
        </div>
      </div>
    </div>
  );
}
