import { useState } from "react";
import { Link } from "react-router-dom";
import { RequireCustomerSession } from "../../../../shared/customer/session/guards";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useStore } from "zustand";
import { useCartQuery } from "../../cart/hooks/useCartQuery";
import { CartEmpty } from "../../cart/components/CartEmpty";
import { useCreateOrderMutation } from "../hooks/useCreateOrderMutation";
import { CheckoutSummary } from "../components/CheckoutSummary";
import { CheckoutNote } from "../components/CheckoutNote";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Skeleton } from "../../../../shared/ui/skeleton";

function CheckoutContent() {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const cartQuery = useCartQuery(sessionKey);
  const createOrder = useCreateOrderMutation();
  const [note, setNote] = useState("");

  if (!sessionKey) return null;

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-3 pt-6">
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
        <Link to="/c/menu" className={buttonVariants({ variant: "outline" }) + " mt-4 inline-block"}>
          Về thực đơn
        </Link>
      </div>
    );
  }

  const handleSubmit = () => {
    createOrder.mutate({
      cartKey: cart.cartKey,
      sessionKey,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Thanh toán</h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <CheckoutSummary cart={cart} />
          <CheckoutNote value={note} onChange={setNote} />
          {createOrder.error && (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  {createOrder.error.message}
                  {createOrder.error.correlationId && (
                    <span className="mt-1 block text-xs">Mã: {createOrder.error.correlationId}</span>
                  )}
                  {(createOrder.error.status === 401 || createOrder.error.status === 403) && (
                    <span className="mt-2 block">
                      <Link to="/c/qr" className="underline">Quét mã bàn</Link> để đăng nhập phiên.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              {createOrder.error.status === 409 && (
                <Button variant="outline" size="sm" onClick={() => cartQuery.refetch()}>
                  Làm mới giỏ hàng
                </Button>
              )}
            </>
          )}
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={createOrder.isPending}
            onClick={handleSubmit}
          >
            {createOrder.isPending ? "Đang xử lý…" : "Đặt món"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerCheckoutPage() {
  return (
    <RequireCustomerSession>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <Link to="/c/cart" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              ← Giỏ hàng
            </Link>
          </div>
        </header>
        <main className="flex-1">
          <CheckoutContent />
        </main>
      </div>
    </RequireCustomerSession>
  );
}
