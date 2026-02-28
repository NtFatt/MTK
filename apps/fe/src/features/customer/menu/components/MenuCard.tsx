import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import type { MenuItem } from "../types";
import { Card, CardContent, CardFooter, CardHeader } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useAddCartItem } from "../../cart/hooks/useCartMutations";
import { savePendingAction } from "../../../../shared/customer/session/pendingActions";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

type MenuCardProps = {
  item: MenuItem;
};

export function MenuCard({ item }: MenuCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const addCartItem = useAddCartItem(sessionKey);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [apiOutOfStock, setApiOutOfStock] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(`oos:${item.id}`) === "1";
  });
  const remain = item.remainingQty;
  const outOfStock =
    apiOutOfStock || !item.isAvailable || (remain != null && remain <= 0);
  const handleAdd = () => {
    if (outOfStock) return;

    if (!sessionKey) {
      const next = `${location.pathname}${location.search}`;
      savePendingAction({
        kind: "ADD_CART_ITEM",
        returnTo: next,
        payload: { itemId: item.id, quantity: 1, note: "" }, // ✅ đúng type pendingActions
      });
      navigate(`/c/qr?next=${encodeURIComponent(next)}`);
      return;
    }

    addCartItem.mutate(
      { itemId: item.id, qty: 1, note: "" },
      {
        onSuccess: () => {
          setAddedFeedback(true);
          setTimeout(() => setAddedFeedback(false), 1000);
        },
        onError: (err: any) => {
          const code = err?.code ?? err?.error?.code ?? err?.response?.data?.code;
          if (code === "OUT_OF_STOCK") {
            setApiOutOfStock(true);
            window.sessionStorage.setItem(`oos:${item.id}`, "1");
          }
        },
      }
    );
  };

  return (
    <Card className={cn("relative overflow-hidden", outOfStock && "opacity-80")}>
      {/* ✅ Overlay / ribbon "Hết hàng" nhìn rõ */}
      {outOfStock && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 bg-background/40" />
          <div className="absolute left-3 top-3 z-20 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow">
            Hết hàng
          </div>
        </>
      )}

      {item.imageUrl && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-foreground">{item.name}</h3>

          {/* ✅ Badge nhỏ (optional) */}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-lg font-medium text-primary">{formatVnd(item.price)}</p>

        {/* ✅ Nếu muốn show số lượng còn lại (khi có) thì bật dòng này */}
        {/* {remain != null && !outOfStock && (
          <p className="mt-1 text-xs text-muted-foreground">Còn lại: {remain}</p>
        )} */}

        {item.tags && item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          size="sm"
          className="w-full"
          disabled={outOfStock || addCartItem.isPending}
          onClick={handleAdd}
        >
          {outOfStock
            ? "Hết hàng"
            : addedFeedback
              ? "Đã thêm"
              : addCartItem.isPending
                ? "Đang thêm…"
                : "Thêm"}
        </Button>
      </CardFooter>
    </Card>
  );
}