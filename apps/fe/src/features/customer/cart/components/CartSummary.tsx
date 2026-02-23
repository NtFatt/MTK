import { Link } from "react-router-dom";
import { Separator } from "../../../../shared/ui/separator";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

type CartSummaryProps = {
  subtotal: number;
  total?: number;
};

export function CartSummary({ subtotal, total }: CartSummaryProps) {
  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tạm tính</span>
        <span>{formatVnd(subtotal)}</span>
      </div>
      {total != null && total !== subtotal && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tổng cộng</span>
          <span className="font-medium">{formatVnd(total)}</span>
        </div>
      )}
      <Link to="/c/checkout" className={cn(buttonVariants({ size: "lg" }), "w-full inline-block text-center")}>
        Tiếp tục thanh toán
      </Link>
    </div>
  );
}
