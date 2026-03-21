import { Link } from "react-router-dom";
import { Separator } from "../../../../shared/ui/separator";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

type CartSummaryProps = {
  subtotal: number;
  discount?: number;
  total?: number;
  voucherCode?: string | null;
  openBill?: {
    orderCode: string;
    status: string;
    subtotal: number;
    discount: number;
    total: number;
    voucherCode?: string | null;
  } | null;
};

const openBillStatusLabel: Record<string, string> = {
  NEW: "Mới tạo",
  RECEIVED: "Bếp đã nhận",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng",
  SERVING: "Đang phục vụ",
  COMPLETED: "Tạm đóng bill",
};

export function CartSummary({
  subtotal,
  discount = 0,
  total,
  voucherCode,
  openBill,
}: CartSummaryProps) {
  const ctaLabel = openBill ? "Gọi thêm món vào bill hiện tại" : "Tiếp tục thanh toán";

  return (
    <div className="space-y-4">
      {openBill ? (
        <div className="rounded-[22px] border border-[#dfc49f]/75 bg-[#fff7ea] px-4 py-4 text-sm text-[#6d4928]">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9b7452]">Bill đang mở</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#4e2916]">{openBill.orderCode}</span>
            <span className="rounded-full border border-[#e5c9a0] bg-white/70 px-3 py-1 text-xs font-medium text-[#8a684d]">
              {openBillStatusLabel[openBill.status] ?? openBill.status}
            </span>
          </div>
          <div className="mt-2 text-[#7a5b44]">
            Món trong giỏ sẽ được cộng vào cùng bill này, không tạo bill mới cho bạn.
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#7a5b44]">
            <span>Tạm tính hiện tại: {formatVnd(openBill.total)}</span>
            {openBill.discount > 0 ? (
              <span>
                {openBill.voucherCode ? `Voucher ${openBill.voucherCode}` : "Đã giảm"}: -{formatVnd(openBill.discount)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <Separator className="bg-[#e0c49d]/70" />

      <div className="flex justify-between text-sm text-[#7a5b44]">
        <span>Tạm tính</span>
        <span className="font-medium text-[#5d341b]">{formatVnd(subtotal)}</span>
      </div>

      {discount > 0 ? (
        <div className="flex justify-between text-sm text-[#7a5b44]">
          <span>{voucherCode ? `Voucher ${voucherCode}` : "Giảm giá"}</span>
          <span className="font-semibold text-[#c43c2d]">-{formatVnd(discount)}</span>
        </div>
      ) : null}

      {total != null && total !== subtotal ? (
        <div className="flex justify-between text-sm text-[#7a5b44]">
          <span>Tổng cộng</span>
          <span className="font-semibold text-[#5d341b]">{formatVnd(total)}</span>
        </div>
      ) : null}

      <Link
        to="/c/checkout"
        className={cn(
          buttonVariants({ size: "lg" }),
          "inline-flex w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-center text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110",
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
