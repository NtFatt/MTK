import { useMemo } from "react";
import { useStore } from "zustand";
import { Link } from "react-router-dom";

import { useMenuQuery } from "../../menu/hooks/useMenuQuery";
import {
  useCustomerSessionStore,
  selectBranchId,
  customerSessionStore,
  selectSessionKey,
} from "../../../../shared/customer/session/sessionStore";
import { RequireCustomerSession } from "../../../../shared/customer/session/guards";

import { useCartQuery } from "../hooks/useCartQuery";
import { CartEmpty } from "../components/CartEmpty";
import { CartItemRow } from "../components/CartItemRow";
import { CartSummary } from "../components/CartSummary";

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

function CartPageContent({ menuNameById }: { menuNameById: Map<string, string> }) {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const cartQuery = useCartQuery(sessionKey);

  if (!sessionKey) {
    return null;
  }

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>

        <Card className="rounded-2xl">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cartQuery.error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Giỏ hàng</h1>
          <p className="text-sm text-muted-foreground">
            Không thể tải dữ liệu giỏ hàng ở thời điểm hiện tại.
          </p>
        </div>

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
          <Link to="/c/menu" className={buttonVariants({ variant: "outline" })}>
            Về thực đơn
          </Link>
        </div>
      </div>
    );
  }

  const cart = cartQuery.data;

  if (!cart || !cart.items?.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border bg-card p-6">
          <CartEmpty />
          <div className="mt-4">
            <Link to="/c/menu" className={buttonVariants({ variant: "outline" })}>
              Về thực đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal =
    cart.subtotal ?? cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);

  const itemCount = cart.items.reduce((sum, item) => sum + Number(item.qty ?? 1), 0);
  const total = cart.total ?? subtotal;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Giỏ hàng</h1>
        <p className="text-sm text-muted-foreground">
          Kiểm tra lại món đã chọn trước khi sang bước xác nhận đơn hàng.
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Món đã chọn</h2>

            <Link to="/c/menu" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Thêm món
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Bạn có thể tăng giảm số lượng hoặc quay lại thực đơn để chọn thêm.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={String(item.itemId)} className="rounded-xl border bg-background/60 p-3">
                <CartItemRow
                  item={item}
                  cartKey={cart.cartKey}
                  sessionKey={sessionKey}
                  displayName={
                    item.name ??
                    menuNameById.get(String(item.itemId)) ??
                    `Món #${String(item.itemId)}`
                  }
                />
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <CartSummary subtotal={subtotal} total={cart.total} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerCartPage() {
  const branchId = useCustomerSessionStore(selectBranchId);
  const menuQuery = useMenuQuery(branchId ? { branchId } : {});

  const menuNameById = useMemo(() => {
    const map = new Map<string, string>();
    const items = menuQuery.data?.items ?? [];

    for (const it of items as any[]) {
      const id = it?.id ?? it?.itemId;
      const name =
        it?.name ??
        it?.itemName ??
        it?.menuItemName ??
        it?.productName ??
        it?.title;

      if (
        (typeof id === "string" || typeof id === "number") &&
        typeof name === "string" &&
        name.trim()
      ) {
        map.set(String(id), name.trim());
      }
    }

    return map;
  }, [menuQuery.data]);

  return (
    <RequireCustomerSession>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link to="/c/menu" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              ← Thực đơn
            </Link>

            <div className="text-sm font-medium text-muted-foreground">Giỏ hàng</div>
          </div>
        </header>

        <main className="flex-1">
          <CartPageContent menuNameById={menuNameById} />
        </main>
      </div>
    </RequireCustomerSession>
  );
}