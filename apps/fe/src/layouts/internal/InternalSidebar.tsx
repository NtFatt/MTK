import { useEffect, useState } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { cn } from "../../shared/utils/cn";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "block rounded-lg px-3 py-2 text-sm transition",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function InternalSidebar() {
  const { branchId } = useParams<{ branchId: string }>();
  const loc = useLocation();

  const base = branchId ? `/i/${branchId}` : "/i";
  const adminBase = `${base}/admin`;

  const invStock = `${adminBase}/inventory/stock`;
  const invHolds = `${adminBase}/inventory/holds`;
  const invAdj = `${adminBase}/inventory/adjustments`;

  const [invOpen, setInvOpen] = useState(false);

  useEffect(() => {
    if (loc.pathname.includes("/admin/inventory/")) setInvOpen(true);
  }, [loc.pathname]);

  return (
    <aside className="sticky top-0 h-screen w-[280px] border-r bg-background">
      <div className="flex h-full flex-col">
        <div className="px-5 py-5">
          <div className="text-lg font-semibold">Hadilao Admin</div>
          <div className="text-xs text-muted-foreground">Internal Console</div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <NavItem to={`${adminBase}/dashboard`} label="Dashboard" />
          <NavItem to={`${adminBase}/staff`} label="Nhân viên" />
          <NavItem to={`${adminBase}/tables`} label="Tables" />
          <NavItem to={`${adminBase}/kitchen`} label="Kitchen" />
          <NavItem to={`${adminBase}/cashier`} label="Cashier" />

          <button
            type="button"
            onClick={() => setInvOpen((v) => !v)}
            className={cn(
              "mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
              loc.pathname.includes("/admin/inventory/")
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Kho nguyên liệu</span>
            <span className="text-xs">{invOpen ? "▾" : "▸"}</span>
          </button>

          {invOpen && (
            <div className="ml-2 mt-1 space-y-1 border-l pl-2">
              <NavItem to={invStock} label="Tồn kho" />
              <NavItem to={invHolds} label="Holds" />
              <NavItem to={invAdj} label="Lịch sử điều chỉnh" />
            </div>
          )}
        </nav>

        <div className="border-t px-3 py-3 text-xs text-muted-foreground">
          v0.1 • internal
        </div>
      </div>
    </aside>
  );
}