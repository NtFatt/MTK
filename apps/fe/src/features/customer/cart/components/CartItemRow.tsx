import type { CartItem as CartItemType } from "../types";
import { Button } from "../../../../shared/ui/button";
import { useUpdateCartItem, useRemoveCartItem } from "../hooks/useCartMutations";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

type CartItemRowProps = {
  item: CartItemType;
  cartKey: string;
  sessionKey: string;
  displayName: string; // ✅ add
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
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{displayName}</p>
        <p className="text-sm text-muted-foreground">
          {formatVnd(price)} × {item.qty} = {formatVnd(lineTotal)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={pending || item.qty <= 1}
          onClick={handleDecrease}
          aria-label="Giảm số lượng"
        >
          −
        </Button>
        <span className="min-w-[1.5rem] text-center text-sm">{item.qty}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={pending}
          onClick={handleIncrease}
          aria-label="Tăng số lượng"
        >
          +
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={pending}
          onClick={handleRemove}
        >
          Xóa
        </Button>
      </div>
    </div>
  );
}
