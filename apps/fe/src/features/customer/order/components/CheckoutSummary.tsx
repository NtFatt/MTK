import type { Cart } from "../../cart/types";
import { Separator } from "../../../../shared/ui/separator";
import { summarizeItemCustomization } from "../../shared/itemCustomization";

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

const openBillStatusLabel: Record<string, string> = {
  NEW: "Moi tao",
  RECEIVED: "Bep da nhan",
  PREPARING: "Dang chuan bi",
  READY: "San sang",
  SERVING: "Dang phuc vu",
  COMPLETED: "Tam dong bill",
};

type CheckoutSummaryProps = {
  cart: Cart;
};

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const subtotal = cart.subtotal ?? cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const discount = cart.discount ?? cart.voucher?.discountAmount ?? 0;
  const total = cart.total ?? subtotal;
  const openBill = cart.openBill ?? null;

  return (
    <div className="space-y-5">
      {openBill ? (
        <div className="rounded-[22px] border border-[#dfc49f]/75 bg-[#fff8ed] px-4 py-4 text-sm text-[#6d4928]">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9b7452]">Bill hien tai</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#4e2916]">{openBill.orderCode}</span>
            <span className="rounded-full border border-[#e5c9a0] bg-white/70 px-3 py-1 text-xs font-medium text-[#8a684d]">
              {openBillStatusLabel[openBill.status] ?? openBill.status}
            </span>
          </div>
          <p className="mt-2 text-[#7a5a43]">
            Xac nhan xong, cac mon ben duoi se duoc cong vao bill nay va kitchen/cashier van theo doi cung mot ma don.
          </p>
          <div className="mt-3 grid gap-2 text-xs text-[#7a5b44] sm:grid-cols-3">
            <span>Tong bill hien tai: {formatVnd(openBill.total)}</span>
            <span>Tạm tính Món mới: {formatVnd(total)}</span>
            <span>Sau khi cong mon, bill se cap nhat theo tong moi.</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {cart.items.map((item) => {
          const price = item.unitPrice ?? 0;
          const lineTotal = price * item.qty;
          const itemName = getItemDisplayName(item);
          const customization = summarizeItemCustomization(item.itemOptions ?? null);

          return (
            <div
              key={`${String(item.itemId)}:${item.optionsHash ?? "base"}`}
              className="customer-hotpot-stat flex items-start justify-between gap-4 rounded-[22px] px-4 py-4"
            >
              <div className="min-w-0">
                <div className="customer-mythmaker-title truncate text-2xl text-[#4e2916]">
                  {itemName}
                </div>
                <div className="mt-2 text-sm text-[#7a5a43]">
                  {formatVnd(price)} × {item.qty}
                </div>
                {customization.chips.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customization.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-[#dfc49f]/75 bg-[#fff8ed] px-3 py-1 text-xs font-medium text-[#6e4424]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
                {customization.note ? (
                  <div className="mt-3 rounded-[18px] border border-dashed border-[#e4c8a1]/70 bg-[#fffaf4] px-3 py-2 text-sm text-[#7a5a43]">
                    Ghi chu: <span className="font-medium text-[#5a311b]">{customization.note}</span>
                  </div>
                ) : null}
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
