import { Link, useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import { buttonVariants } from "../../../../shared/ui/button";
import { Badge } from "../../../../shared/ui/badge";
import { cn } from "../../../../shared/utils/cn";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useCartQuery } from "../../cart/hooks/useCartQuery";

export function CustomerNavbar() {
  const navigate = useNavigate();
  const sessionKey = useStore(customerSessionStore, selectSessionKey);

  // nếu store bạn có reset() thì dùng, không có thì bỏ dòng này
  const resetSession = useStore(customerSessionStore, (s: any) => s.reset?.bind(s));

  const cartQuery = useCartQuery(sessionKey);
const cartCount =
  (cartQuery.data?.items ?? []).reduce((acc: number, it: any) => acc + Number(it.qty ?? it.quantity ?? 1), 0);  const onSwitchBranch = () => {
    // 1) reset store (nếu có)
    resetSession?.();

    // 2) reset localStorage (đặt đúng key bạn đang dùng)
    localStorage.removeItem("hadilao.sessionKey");
    localStorage.removeItem("hadilao.branchId");
    localStorage.removeItem("hadilao.cartKey");

    // 3) đi về màn chọn chi nhánh
    navigate("/c/start", { replace: true });
  };

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md")}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/c/menu" className="text-lg font-semibold text-foreground">
          Hadilao
        </Link>

        <nav className="flex items-center gap-2">
          <Link to="/c/cart" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative")}>
            Giỏ hàng
            {cartCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                {cartCount}
              </Badge>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}