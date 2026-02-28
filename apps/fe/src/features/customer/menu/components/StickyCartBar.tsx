import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "zustand";

import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useCartQuery } from "../../cart/hooks/useCartQuery";

function formatVnd(price: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

export function StickyCartBar() {
    const sessionKey = useStore(customerSessionStore, selectSessionKey);
    const cartQuery = useCartQuery(sessionKey);

    const { count, total } = useMemo(() => {
        const items = cartQuery.data?.items ?? [];
        const count = items.reduce((acc: number, it: any) => acc + Number(it.qty ?? it.quantity ?? 1), 0);

        // ưu tiên field tổng từ BE nếu có
        const total =
            Number(cartQuery.data?.total ?? cartQuery.data?.subtotal ?? NaN) ||
            items.reduce((acc: number, it: any) => acc + Number(it.lineTotal ?? (it.price ?? 0) * (it.qty ?? it.quantity ?? 1)), 0);

        return { count, total };
    }, [cartQuery.data]);

    // Không có session hoặc giỏ rỗng => không hiện
    if (!sessionKey) return null;
    if (!cartQuery.data) return null;
    if (count <= 0) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-4">
            <div className="mx-auto w-full max-w-6xl px-4">
                <div
                    className={cn(
                        "pointer-events-auto flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur",
                    )}
                >
                    <div className="min-w-0">
                        <div className="text-sm font-semibold">Giỏ hàng • {count} món</div>
                        <div className="truncate text-xs text-muted-foreground">Tạm tính: {formatVnd(total)}</div>
                    </div>

                    <Link
                        to="/c/cart"
                        className="shrink-0 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    >
                        Xem giỏ
                    </Link>
                </div>
            </div>
        </div>
    );
}