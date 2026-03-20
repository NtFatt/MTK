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
};

export function CartSummary({ subtotal, discount = 0, total, voucherCode }: CartSummaryProps) {
  return (
    <div className="space-y-4">
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
        Tiếp tục thanh toán
      </Link>
    </div>
  );
}
