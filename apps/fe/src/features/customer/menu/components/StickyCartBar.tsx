import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "zustand";

import { cn } from "../../../../shared/utils/cn";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useCartQuery } from "../../cart/hooks/useCartQuery";

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

export function StickyCartBar() {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const cartQuery = useCartQuery(sessionKey);

  const { count, total, discount } = useMemo(() => {
    const items = cartQuery.data?.items ?? [];
    const count = items.reduce(
      (acc: number, it: any) => acc + Number(it.qty ?? it.quantity ?? 1),
      0
    );

    const total =
      Number(cartQuery.data?.total ?? cartQuery.data?.subtotal ?? NaN) ||
      items.reduce(
        (acc: number, it: any) =>
          acc + Number(it.lineTotal ?? (it.price ?? 0) * (it.qty ?? it.quantity ?? 1)),
        0
      );

    const discount = Number(cartQuery.data?.discount ?? cartQuery.data?.voucher?.discountAmount ?? 0);

    return { count, total, discount };
  }, [cartQuery.data]);

  if (!sessionKey) return null;
  if (!cartQuery.data) return null;
  if (count <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-4">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="customer-mythmaker-panel-strong pointer-events-auto relative overflow-hidden rounded-[28px] px-4 py-3 shadow-[0_28px_70px_-40px_rgba(53,26,9,0.82)]">
          <div className="pointer-events-none absolute inset-0 opacity-15 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_18px)]" />
          <span className="customer-hotpot-steam absolute left-10 top-3 scale-75" />
          <span className="customer-hotpot-steam customer-hotpot-steam-delay-3 absolute left-16 top-0 scale-[0.65]" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <div className="absolute inset-x-1 bottom-1 h-8 rounded-[999px] border border-[#f0d5a0]/40 bg-[linear-gradient(180deg,#6b391b,#41200f)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
                <div className="absolute inset-x-2 bottom-6 h-5 rounded-full border border-[#f6e1b9]/70 bg-[linear-gradient(180deg,#f5d59c,#d6843f)]" />
                <div className="absolute left-2 top-2 h-2 w-10 rounded-full bg-[#f6e7c6]/20 blur-sm" />
              </div>

              <div className="min-w-0">
                <div className="customer-mythmaker-title text-2xl font-semibold text-[#fff1d7]">
                  Nồi đang chờ • {count} món
                </div>
                <div className="truncate text-xs uppercase tracking-[0.22em] text-[#f6d9a7]/75">
                  Tạm tính: {formatVnd(total)}
                </div>
                {discount > 0 ? (
                  <div className="truncate text-[11px] uppercase tracking-[0.18em] text-[#cbe3a5]">
                    Đang tiết kiệm {formatVnd(discount)}
                  </div>
                ) : null}
              </div>
            </div>

            <Link
              to="/c/cart"
              data-cart-target="sticky"
              className={cn(
                "shrink-0 rounded-full border border-[#f3dfb8]/80 bg-[#fff6e3] px-5 py-3 text-sm font-semibold text-[#6b291d] shadow-[0_18px_36px_-24px_rgba(36,17,5,0.9)] transition hover:bg-[#ffeecf]"
              )}
            >
              Xem nồi lẩu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
