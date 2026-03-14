import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "zustand";

import { RequireCustomerSession } from "../../../../shared/customer/session/guards";
import {
  customerSessionStore,
  selectSessionKey,
  selectBranchId,
} from "../../../../shared/customer/session/sessionStore";

import { useCartQuery } from "../../cart/hooks/useCartQuery";
import type { Cart } from "../../cart/types";
import { CartEmpty } from "../../cart/components/CartEmpty";
import { useMenuQuery } from "../../menu/hooks/useMenuQuery";
import { useCreateOrderMutation } from "../hooks/useCreateOrderMutation";
import { CheckoutSummary } from "../components/CheckoutSummary";
import { CheckoutNote } from "../components/CheckoutNote";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Skeleton } from "../../../../shared/ui/skeleton";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function CheckoutContent() {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const branchId = useStore(customerSessionStore, selectBranchId);

  const cartQuery = useCartQuery(sessionKey);
  const menuQuery = useMenuQuery(branchId ? { branchId } : {});
  const createOrder = useCreateOrderMutation();
  const [note, setNote] = useState("");

  const rawCart = cartQuery.data;

  const menuNameById = useMemo(() => {
    const map: Record<string, string> = {};
    const items = Array.isArray(menuQuery.data?.items) ? menuQuery.data.items : [];

    for (const raw of items as any[]) {
      const rawId = raw?.id ?? raw?.itemId;
      const rawName =
        raw?.name ??
        raw?.itemName ??
        raw?.menuItemName ??
        raw?.productName ??
        raw?.title;

      if (
        (typeof rawId === "string" || typeof rawId === "number") &&
        typeof rawName === "string" &&
        rawName.trim()
      ) {
        map[String(rawId)] = rawName.trim();
      }
    }

    return map;
  }, [menuQuery.data]);

  const cart: Cart | undefined = useMemo(() => {
    if (!rawCart) return rawCart;

    return {
      ...rawCart,
      items: rawCart.items.map((item: any) => {
        const fallbackName =
          (typeof item.name === "string" && item.name.trim() ? item.name.trim() : "") ||
          (typeof item.itemName === "string" && item.itemName.trim() ? item.itemName.trim() : "") ||
          (typeof item.menuItemName === "string" && item.menuItemName.trim()
            ? item.menuItemName.trim()
            : "") ||
          (typeof item.productName === "string" && item.productName.trim()
            ? item.productName.trim()
            : "") ||
          menuNameById[String(item.itemId)] ||
          undefined;

        return {
          ...item,
          name: fallbackName,
        };
      }),
    };
  }, [rawCart, menuNameById]);

  if (!sessionKey) return null;

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cartQuery.error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Alert variant="destructive">
          <AlertDescription>
            {cartQuery.error.message}
            {cartQuery.error.correlationId && (
              <span className="mt-1 block text-xs">Mã: {cartQuery.error.correlationId}</span>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => cartQuery.refetch()}>
            Thử lại
          </Button>
          <Link to="/c/cart" className={buttonVariants({ variant: "outline" })}>
            Về giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border bg-card p-6">
          <CartEmpty />
          <Link
            to="/c/menu"
            className={buttonVariants({ variant: "outline" }) + " mt-4 inline-flex"}
          >
            Về thực đơn
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = cart.items.reduce(
    (acc: number, item: any) => acc + Number(item.qty ?? item.quantity ?? 1),
    0,
  );

  const total =
    Number(cart.total ?? cart.subtotal ?? NaN) ||
    cart.items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.lineTotal ?? (item.price ?? item.unitPrice ?? 0) * (item.qty ?? item.quantity ?? 1)),
      0,
    );

  const handleSubmit = () => {
    createOrder.mutate({
      cartKey: cart.cartKey,
      sessionKey,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Thanh toán</h1>
        <p className="text-sm text-muted-foreground">
          Xác nhận món ăn, ghi chú thêm nếu cần, rồi tiếp tục sang bước thanh toán đơn hàng.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Số lượng món</div>
          <div className="mt-1 text-lg font-semibold">{itemCount}</div>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Tạm tính</div>
          <div className="mt-1 text-lg font-semibold">{formatVnd(total)}</div>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="space-y-1">
          <h2 className="text-lg font-semibold">Xác nhận đơn hàng</h2>
          <p className="text-sm text-muted-foreground">
            Kiểm tra lại món trong giỏ trước khi tạo đơn.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <CheckoutSummary cart={cart} />

          <div className="rounded-xl border bg-muted/30 p-4">
            <CheckoutNote value={note} onChange={setNote} />
          </div>

          {createOrder.error && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertDescription>
                  {createOrder.error.message}
                  {createOrder.error.correlationId && (
                    <span className="mt-1 block text-xs">Mã: {createOrder.error.correlationId}</span>
                  )}
                  {(createOrder.error.status === 401 || createOrder.error.status === 403) && (
                    <span className="mt-2 block">
                      <Link to="/c/qr" className="underline">
                        Quét mã bàn
                      </Link>{" "}
                      để khôi phục phiên trước khi tiếp tục.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-3">
                {createOrder.error.status === 409 && (
                  <Button variant="outline" size="sm" onClick={() => cartQuery.refetch()}>
                    Làm mới giỏ hàng
                  </Button>
                )}

                <Link to="/c/cart" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Quay lại giỏ hàng
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={createOrder.isPending}
              onClick={handleSubmit}
            >
              {createOrder.isPending ? "Đang xử lý…" : "Đặt món và tiếp tục thanh toán"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Sau khi tạo đơn, hệ thống sẽ chuyển bạn sang bước thanh toán.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerCheckoutPage() {
  return (
    <RequireCustomerSession>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link to="/c/cart" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              ← Giỏ hàng
            </Link>

            <div className="text-sm font-medium text-muted-foreground">
              Bước 1 / 2 · Xác nhận đơn
            </div>
          </div>
        </header>

        <main className="flex-1">
          <CheckoutContent />
        </main>
      </div>
    </RequireCustomerSession>
  );
}