import type { CartItem as CartItemType } from "../types";
import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { useUpdateCartItem, useRemoveCartItem } from "../hooks/useCartMutations";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

type CartItemRowProps = {
  item: CartItemType;
  cartKey: string;
  sessionKey: string;
  displayName: string;
};

export function CartItemRow({ item, cartKey, sessionKey, displayName }: CartItemRowProps) {
  const updateMutation = useUpdateCartItem(sessionKey);
  const removeMutation = useRemoveCartItem(sessionKey);

  const price = item.unitPrice ?? 0;
  const lineTotal = price * item.qty;
  const pending = updateMutation.isPending || removeMutation.isPending;

  const handleIncrease = () => {
    updateMutation.mutate({ itemId: item.itemId, qty: item.qty + 1 });
  };

  const handleDecrease = () => {
    if (item.qty <= 1) return;
    updateMutation.mutate({ itemId: item.itemId, qty: item.qty - 1 });
  };

  const handleRemove = () => {
    removeMutation.mutate({ cartKey, itemId: item.itemId });
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.24em] text-[#9f7751]">Phiếu bếp</div>
        <p className="customer-mythmaker-title mt-1 text-2xl text-[#4f2b18]">{displayName}</p>
        <p className="mt-2 text-sm text-[#7c5d45]">
          {formatVnd(price)} × {item.qty} = <span className="font-semibold text-[#c43c2d]">{formatVnd(lineTotal)}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-[#d9bd95]/80 bg-white text-[#6f4425] hover:bg-[#fff0d7]"
            disabled={pending || item.qty <= 1}
            onClick={handleDecrease}
            aria-label="Giảm số lượng"
          >
            −
          </Button>
          <span className="min-w-[2rem] text-center text-sm font-semibold text-[#633a21]">{item.qty}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-[#d9bd95]/80 bg-white text-[#6f4425] hover:bg-[#fff0d7]"
            disabled={pending}
            onClick={handleIncrease}
            aria-label="Tăng số lượng"
          >
            +
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("rounded-full px-4 text-[#b33d2f] hover:bg-[#fff0eb] hover:text-[#a22d20]")}
          disabled={pending}
          onClick={handleRemove}
        >
          Bỏ món
        </Button>
      </div>
    </div>
  );
}
