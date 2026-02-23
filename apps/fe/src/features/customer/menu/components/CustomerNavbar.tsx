import { Link } from "react-router-dom";
import { useStore } from "zustand";
import { buttonVariants } from "../../../../shared/ui/button";
import { Badge } from "../../../../shared/ui/badge";
import { cn } from "../../../../shared/utils/cn";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { useCartQuery } from "../../cart/hooks/useCartQuery";

export function CustomerNavbar() {
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const cartQuery = useCartQuery(sessionKey);
  const cartCount = cartQuery.data?.items?.length ?? 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/c/menu" className="text-lg font-semibold text-foreground">
          Hadilao
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/c/cart"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative")}
          >
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
