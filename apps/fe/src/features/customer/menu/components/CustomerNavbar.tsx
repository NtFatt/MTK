import { Link, useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import { buttonVariants } from "../../../../shared/ui/button";
import { Badge } from "../../../../shared/ui/badge";
import { cn } from "../../../../shared/utils/cn";
import {
  customerSessionStore,
  selectSessionKey,
  selectTableCode,
} from "../../../../shared/customer/session/sessionStore";
import { useCartQuery } from "../../cart/hooks/useCartQuery";

export function CustomerNavbar() {
  const navigate = useNavigate();
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const tableCode = useStore(customerSessionStore, selectTableCode);

  const cartQuery = useCartQuery(sessionKey);
  const cartCount = (cartQuery.data?.items ?? []).reduce(
    (acc: number, it: any) => acc + Number(it.qty ?? it.quantity ?? 1),
    0
  );

  const onSwitchBranch = () => {
    customerSessionStore.getState().clear();
    navigate("/c/qr", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 md:gap-4">
        <Link to="/c/menu" className="customer-hotpot-signboard relative min-w-0 rounded-[28px] px-5 py-4 pr-8">
          <span className="absolute left-5 top-[-18px] h-5 w-px bg-[#d5a766]" />
          <span className="absolute left-20 top-[-18px] h-5 w-px bg-[#d5a766]" />
          <div className="customer-mythmaker-title text-[1.7rem] font-semibold leading-none text-[#fff2d9] sm:text-[2rem]">
            Hadilao
          </div>
          <div className="customer-mythmaker-script mt-1 text-xl text-[#ffcd69]">
            Tiệm lẩu Đường Hạnh Phúc
          </div>
        </Link>

        <div className="hidden shrink-0 rounded-full border border-[#d8bc8e]/80 bg-[#fff8eb]/82 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7a5737] shadow-[0_12px_28px_-18px_rgba(67,35,17,0.55)] md:block">
          {tableCode ? `Bàn ${tableCode}` : "Đang gọi món tại bàn"}
        </div>

        <nav className="flex items-center gap-2">
          <Link
            to="/c/cart"
            data-cart-target="nav"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "relative rounded-full border border-[#d9bc95]/80 bg-[#fff7ec]/86 px-4 text-[#6a3920] shadow-[0_12px_28px_-18px_rgba(67,35,17,0.55)] transition hover:bg-[#fff2df]"
            )}
          >
            Giỏ hàng
            {cartCount > 0 ? (
              <Badge className="ml-2 h-5 min-w-5 bg-[#c93d2d] px-1 text-xs text-[#fffaf3]">
                {cartCount}
              </Badge>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={onSwitchBranch}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "rounded-full border border-[#d0c27a]/80 bg-[#5a7d36] px-4 text-[#fff6dd] shadow-[0_12px_28px_-18px_rgba(38,59,13,0.7)] transition hover:bg-[#638b3d]"
            )}
          >
            Mở bàn khác
          </button>
        </nav>
      </div>
    </header>
  );
}
