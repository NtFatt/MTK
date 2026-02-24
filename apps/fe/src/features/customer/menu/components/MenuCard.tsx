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

  const handleAdd = () => {
    if (!sessionKey) {
      const next = `${location.pathname}${location.search}`;
      savePendingAction({
        kind: "ADD_CART_ITEM",
        returnTo: next,
        payload: { itemId: item.id, quantity: 1, note: "" },
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
      }
    );
  };

  return (
    <Card className={cn("overflow-hidden")}>
      {item.imageUrl && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-foreground">{item.name}</h3>
          {!item.isAvailable && (
            <Badge variant="secondary">Hết món</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-lg font-medium text-primary">{formatVnd(item.price)}</p>
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
          disabled={!item.isAvailable || addCartItem.isPending}
          onClick={handleAdd}
        >
          {addedFeedback ? "Đã thêm" : addCartItem.isPending ? "Đang thêm…" : "Thêm"}
        </Button>
      </CardFooter>
    </Card>
  );
}
