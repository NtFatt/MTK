import { NavLink, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../shared/auth/authStore";
import { cn } from "../../shared/utils/cn";

function Btn({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted",
          isActive ? "bg-muted" : ""
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function InternalShellNav({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const role = String(session?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN";

  const sessionBid = session?.branchId != null ? String(session.branchId) : "";
  const urlBid = String(branchId ?? "").trim();
  const bid = isAdmin ? urlBid : sessionBid || urlBid;

  const perms: string[] = session?.permissions ?? [];

  const canTables = perms.includes("ops.tables.read");
  const canCashier = perms.includes("cashier.unpaid.read");
  const canKitchen = perms.includes("kitchen.queue.read");
  const canInventory = perms.includes("inventory.read");
  const canInventoryHolds = perms.includes("inventory.holds.read");
  const canInventoryAdjust = perms.includes("inventory.adjust");

  return (
    <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {canTables && <Btn to={`/i/${bid}/tables`} label="Tables" />}
        {canCashier && <Btn to={`/i/${bid}/cashier`} label="Cashier" />}
        {canKitchen && <Btn to={`/i/${bid}/kitchen`} label="Kitchen" />}

        {canInventory && <Btn to={`/i/${bid}/inventory/stock`} label="Tồn kho" />}
        {canInventoryHolds && <Btn to={`/i/${bid}/inventory/holds`} label="Holds" />}
        {canInventoryAdjust && <Btn to={`/i/${bid}/inventory/adjustments`} label="Lịch sử" />}
      </div>

      {rightSlot}
    </div>
  );
}