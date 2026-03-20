import type { ReactNode } from "react";
import { CustomerFooter } from "../../menu/components/CustomerFooter";
import { CustomerMythmakerBackdrop } from "../../menu/components/CustomerMythmakerBackdrop";
import { CustomerNavbar } from "../../menu/components/CustomerNavbar";
import { StickyCartBar } from "../../menu/components/StickyCartBar";
import { cn } from "../../../../shared/utils/cn";

type CustomerHotpotShellProps = {
  children: ReactNode;
  contentClassName?: string;
  showStickyCart?: boolean;
};

export function CustomerHotpotShell({
  children,
  contentClassName,
  showStickyCart = false,
}: CustomerHotpotShellProps) {
  return (
    <div className="customer-mythmaker-shell flex min-h-screen flex-col overflow-x-clip">
      <CustomerMythmakerBackdrop />
      <CustomerNavbar />

      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:py-8",
          contentClassName,
        )}
      >
        {children}
      </main>

      {showStickyCart ? <StickyCartBar /> : null}
      <CustomerFooter />
    </div>
  );
}
