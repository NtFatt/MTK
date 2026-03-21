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

const openBillStatusLabel: Record<string, string> = {
  NEW: "Moi tao",
  RECEIVED: "Bep da nhan",
  PREPARING: "Dang chuan bi",
  READY: "San sang",
  SERVING: "Dang phuc vu",
  COMPLETED: "Tam dong bill",
};

function CartPageContent({ menuNameById }: { menuNameById: Map<string, string> }) {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const cartQuery = useCartQuery(sessionKey);

  if (!sessionKey) {
    return null;
  }

  if (cartQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Nồi lẩu tại bàn</div>
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-5 w-80 rounded-full" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="customer-hotpot-stat h-24 w-full" />
          <Skeleton className="customer-hotpot-stat h-24 w-full" />
        </div>

        <div className="customer-hotpot-receipt rounded-[30px] p-5">
          <Skeleton className="h-12 w-48 rounded-xl" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-28 w-full rounded-[22px]" />
            <Skeleton className="h-28 w-full rounded-[22px]" />
            <Skeleton className="h-24 w-full rounded-[22px]" />
          </div>
        </div>
      </div>
    );
  }

  if (cartQuery.error) {
    return (
      <div className="space-y-5">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Nồi lẩu tại bàn</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Giỏ hàng của bạn</h1>
          <p className="customer-hotpot-page-subtitle">
            Không thể tải dữ liệu giỏ hàng ở thời điểm hiện tại. Bạn có thể thử lại hoặc quay về
            thực đơn để gọi lại món.
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
              to="/c/menu"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
              )}
            >
              Về thực đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cart = cartQuery.data;

  if (!cart || !cart.items?.length) {
    const openBill = cart?.openBill ?? null;
    const hasOpenBill = Boolean(openBill?.orderCode);

    return (
      <div className="space-y-6">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Nồi lẩu tại bàn</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">
            {hasOpenBill ? "Bill hien tai dang cho Gọi thêm món" : "Gio hang cua ban"}
          </h1>
          <p className="customer-hotpot-page-subtitle">
            {hasOpenBill
              ? `Bill ${openBill?.orderCode} Vẫn đang mở. Quay lại thực đơn để gọi thêm món vào cùng bill này.`
              : "Chưa có món nào trong giỏ. Chọn món từ thực đơn để bếp bắt đầu chuẩn bị cho bạn."}
          </p>
        </section>

        <CartEmpty />
      </div>
    );
  }

  const subtotal =
    cart.subtotal ?? cart.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const discount = cart.discount ?? cart.voucher?.discountAmount ?? 0;

  const itemCount = cart.items.reduce((sum, item) => sum + Number(item.qty ?? 1), 0);
  const total = cart.total ?? subtotal;
  const openBill = cart.openBill ?? null;
  const hasOpenBill = Boolean(openBill?.orderCode);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Nồi lẩu tại bàn</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">
            {hasOpenBill ? "Gọi thêm món" : "Giỏ hàng của bạn"}
          </h1>
        </div>

        <Link
          to="/c/menu"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] px-5 text-[#6a3b20] hover:bg-[#fff2df]",
          )}
        >
          Quay lại thực đơn
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="customer-hotpot-kicker">Phiếu gọi món</div>
            <h2 className="customer-mythmaker-title mt-2 text-3xl text-[#4e2916]">
              {hasOpenBill ? "Món sắp thêm" : "Món đã chọn"}
            </h2>
            <p className="mt-2 text-sm text-[#7a5a43]">
              {hasOpenBill
                ? "Tăng giảm số lượng, xem ghi chú bếp của từng món, hoặc quay lại thực đơn để gọi thêm cho cùng bill."
                : "Tăng giảm số lượng, xem ghi chú bếp của từng món, hoặc quay lại thực đơn để chọn thêm."}
            </p>
          </div>

          <Link
            to="/c/menu"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
            )}
          >
            Gọi thêm món
          </Link>
        </div>

        {hasOpenBill ? (
          <div className="mt-6 rounded-[24px] border border-[#dfc49f]/75 bg-[#fff8ed] px-5 py-5 text-sm text-[#6d4928]">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#9b7452]">Bill dang phuc vu</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#4e2916]">{openBill?.orderCode}</span>
              <span className="rounded-full border border-[#e5c9a0] bg-white/70 px-3 py-1 text-xs font-medium text-[#8a684d]">
                {openBillStatusLabel[openBill?.status ?? ""] ?? openBill?.status}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[#7a5b44] sm:grid-cols-3">
              <span>Tổng hiện tại: {formatVnd(openBill?.total ?? 0)}</span>
              <span>Tạm tính trước đó: {formatVnd(openBill?.subtotal ?? 0)}</span>
              {openBill?.discount ? (
                <span>
                  {openBill.voucherCode ? `Voucher ${openBill.voucherCode}` : "Giảm giá"}: -{formatVnd(openBill.discount)}
                </span>
              ) : (
                <span>Chưa có giảm giá trên bill</span>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {cart.items.map((item, index) => (
            <div
              key={`${String(item.itemId)}:${item.optionsHash ?? "base"}:${index}`}
              className="customer-hotpot-stat rounded-[24px] px-4 py-4"
            >
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

        <div className="mt-6 customer-hotpot-stat rounded-[24px] px-5 py-5">
          <CustomerVoucherPanel cart={cart} sessionKey={sessionKey} />
        </div>

        <div className="mt-6 customer-hotpot-stat rounded-[24px] px-5 py-5">
          <CartSummary
            subtotal={subtotal}
            discount={discount}
            total={cart.total}
            voucherCode={cart.voucher?.code ?? null}
            openBill={openBill}
          />
        </div>
      </section>
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
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <CartPageContent menuNameById={menuNameById} />
      </CustomerHotpotShell>
    </RequireCustomerSession>
  );
}
