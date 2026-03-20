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
import { CustomerVoucherPanel } from "../../vouchers/components/CustomerVoucherPanel";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Skeleton } from "../../../../shared/ui/skeleton";
import { cn } from "../../../../shared/utils/cn";
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";

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
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Bước xác nhận đơn</div>
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-5 w-80 rounded-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="customer-hotpot-stat h-24 w-full" />
          <Skeleton className="customer-hotpot-stat h-24 w-full" />
        </div>

        <div className="customer-hotpot-receipt rounded-[30px] p-6">
          <Skeleton className="h-12 w-52 rounded-xl" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-24 w-full rounded-[22px]" />
            <Skeleton className="h-24 w-full rounded-[22px]" />
            <Skeleton className="h-32 w-full rounded-[22px]" />
          </div>
        </div>
      </div>
    );
  }

  if (cartQuery.error) {
    return (
      <div className="space-y-5">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Bước xác nhận đơn</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Kiểm tra đơn hàng</h1>
          <p className="customer-hotpot-page-subtitle">
            Không thể tải giỏ hàng để tạo đơn. Bạn có thể làm mới hoặc quay lại giỏ hàng.
          </p>
        </section>

        <div className="customer-hotpot-receipt rounded-[28px] border border-[#e4bfb4] p-5">
          <Alert variant="destructive" className="border-none bg-transparent p-0">
            <AlertDescription>
              {cartQuery.error.message}
              {cartQuery.error.correlationId ? (
                <span className="mt-1 block text-xs">Mã: {cartQuery.error.correlationId}</span>
              ) : null}
            </AlertDescription>
          </Alert>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => cartQuery.refetch()}
              className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
            >
              Thử lại
            </Button>
            <Link
              to="/c/cart"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
              )}
            >
              Về giỏ hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Bước xác nhận đơn</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Kiểm tra đơn hàng</h1>
          <p className="customer-hotpot-page-subtitle">
            Giỏ hàng đang trống, nên chưa thể tạo đơn. Quay lại thực đơn để chọn món trước nhé.
          </p>
        </section>

        <CartEmpty />
      </div>
    );
  }

  const itemCount = cart.items.reduce(
    (acc: number, item: any) => acc + Number(item.qty ?? item.quantity ?? 1),
    0,
  );
  const discount = cart.discount ?? cart.voucher?.discountAmount ?? 0;

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
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Bước 1 / 2</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Kiểm tra đơn hàng</h1>
          <p className="customer-hotpot-page-subtitle">
            Xác nhận món ăn, thêm ghi chú cho bếp nếu cần, rồi tiếp tục sang bước thanh toán.
          </p>
        </div>

        <Link
          to="/c/cart"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] px-5 text-[#6a3b20] hover:bg-[#fff2df]",
          )}
        >
          Quay lại giỏ hàng
        </Link>
      </section>

      <div className={`grid gap-4 ${discount > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="customer-hotpot-stat px-5 py-4">
          <div className="customer-hotpot-kicker">Số lượng món</div>
          <div className="customer-mythmaker-title mt-2 text-4xl text-[#5a301a]">{itemCount}</div>
        </div>

        <div className="customer-hotpot-stat px-5 py-4">
          <div className="customer-hotpot-kicker">Tạm tính</div>
          <div className="customer-mythmaker-title mt-2 text-4xl text-[#c43c2d]">{formatVnd(total)}</div>
        </div>

        {discount > 0 ? (
          <div className="customer-hotpot-stat px-5 py-4">
            <div className="customer-hotpot-kicker">Tiết kiệm</div>
            <div className="customer-mythmaker-title mt-2 text-4xl text-[#5f7a35]">
              {formatVnd(discount)}
            </div>
          </div>
        ) : null}
      </div>

      <section className="customer-hotpot-receipt rounded-[30px] p-5 sm:p-6">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Phiếu xác nhận</div>
          <h2 className="customer-mythmaker-title text-3xl text-[#4e2916]">Kiểm tra lần cuối trước khi gửi bếp</h2>
        </div>

        <div className="mt-6 space-y-6">
          <CheckoutSummary cart={cart} />

          <div className="customer-hotpot-stat rounded-[24px] px-5 py-5">
            <CustomerVoucherPanel cart={cart} sessionKey={sessionKey} compact />
          </div>

          <div className="customer-hotpot-stat rounded-[24px] px-5 py-5">
            <CheckoutNote value={note} onChange={setNote} />
          </div>

          {createOrder.error ? (
            <div className="space-y-3 rounded-[22px] border border-[#e4bfb4] bg-[#fff4ef] p-4">
              <Alert variant="destructive" className="border-none bg-transparent p-0">
                <AlertDescription>
                  {createOrder.error.message}
                  {createOrder.error.correlationId ? (
                    <span className="mt-1 block text-xs">Mã: {createOrder.error.correlationId}</span>
                  ) : null}
                  {createOrder.error.status === 401 || createOrder.error.status === 403 ? (
                    <span className="mt-2 block">
                      <Link to="/c/qr" className="underline">
                        Quét mã bàn
                      </Link>{" "}
                      để khôi phục phiên trước khi tiếp tục.
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-3">
                {createOrder.error.status === 409 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cartQuery.refetch()}
                    className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
                  >
                    Làm mới giỏ hàng
                  </Button>
                ) : null}

                <Link
                  to="/c/cart"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
                  )}
                >
                  Quay lại giỏ hàng
                </Link>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
              disabled={createOrder.isPending}
              onClick={handleSubmit}
            >
              {createOrder.isPending ? "Đang xử lý..." : "Đặt món và tiếp tục thanh toán"}
            </Button>

            <p className="text-center text-xs text-[#8a694f]">
              Sau khi tạo đơn, hệ thống sẽ chuyển bạn sang bước thanh toán.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CustomerCheckoutPage() {
  return (
    <RequireCustomerSession>
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <CheckoutContent />
      </CustomerHotpotShell>
    </RequireCustomerSession>
  );
}
