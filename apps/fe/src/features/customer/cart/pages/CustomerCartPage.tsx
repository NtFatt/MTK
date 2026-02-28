import { useMemo } from "react";
import { useMenuQuery } from "../../menu/hooks/useMenuQuery";
import { useCustomerSessionStore, selectBranchId } from "../../../../shared/customer/session/sessionStore";
import { useStore } from "zustand";
import { Link } from "react-router-dom";
import { RequireCustomerSession } from "../../../../shared/customer/session/guards";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useCartQuery } from "../hooks/useCartQuery";
import { CartEmpty } from "../components/CartEmpty";
import { CartItemRow } from "../components/CartItemRow";
import { CartSummary } from "../components/CartSummary";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Skeleton } from "../../../../shared/ui/skeleton";

function CartPageContent({ menuNameById }: { menuNameById: Map<string, string> }) {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const cartQuery = useCartQuery(sessionKey);

  if (!sessionKey) {
    return null; // guard will redirect
  }

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cartQuery.error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Alert variant="destructive">
          <AlertDescription>
            {cartQuery.error.message}
            {cartQuery.error.correlationId && (
              <span className="mt-1 block text-xs">Mã: {cartQuery.error.correlationId}</span>
            )}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => cartQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  const cart = cartQuery.data;
  if (!cart || !cart.items?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <CartEmpty />
      </div>
    );
  }

  const subtotal =
    cart.subtotal ?? cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Giỏ hàng</h1>
        </CardHeader>
        <CardContent className="space-y-2">
          {cart.items.map((item) => (
            <CartItemRow
              key={String(item.itemId)}
              item={item}
              cartKey={cart.cartKey}
              sessionKey={sessionKey}
              displayName={item.name ?? menuNameById.get(String(item.itemId)) ?? `Món #${String(item.itemId)}`}
            />
          ))}
          <CartSummary subtotal={subtotal} total={cart.total} />
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerCartPage() {
  const branchId = useCustomerSessionStore(selectBranchId);
  const menuQuery = useMenuQuery(branchId ? { branchId } : {});

  const menuNameById = useMemo(() => {
    const m = new Map<string, string>();
    const items = menuQuery.data?.items ?? [];
    for (const it of items as any[]) {
      m.set(String(it.id), String(it.name ?? ""));
    }
    return m;
  }, [menuQuery.data]);
  return (
    <RequireCustomerSession>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <Link to="/c/menu" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              ← Thực đơn
            </Link>
          </div>
        </header>
        <main className="flex-1">
          <CartPageContent menuNameById={menuNameById} />        </main>
      </div>
    </RequireCustomerSession>
  );
}
