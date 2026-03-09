import { NavLink, useLocation, useParams } from "react-router-dom";
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
  const loc = useLocation();

  const role = String(session?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN";

  // Non-admin: khóa branch theo session
  const sessionBid = session?.branchId != null ? String(session.branchId) : "";
  const urlBid = String(branchId ?? "").trim();
  const bid = isAdmin ? urlBid : sessionBid || urlBid;

  const perms: string[] = session?.permissions ?? [];
  const canInventory = perms.includes("inventory.read");

  // Nếu đang ở inventory thì show sub tabs
  const inInventory = loc.pathname.includes(`/i/${bid}/inventory/`);

  return (
<div className="mt-6 flex w-full items-center justify-end gap-2">      {/* left group: dãy buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Btn to={`/i/${bid}/tables`} label="Tables" />
        <Btn to={`/i/${bid}/cashier`} label="Cashier" />
        <Btn to={`/i/${bid}/kitchen`} label="Kitchen" />

        {canInventory && (
          <>
            <Btn to={`/i/${bid}/inventory/stock`} label="Tồn kho" />
            {inInventory && (
              <>
                <Btn to={`/i/${bid}/inventory/holds`} label="Holds" />
                <Btn to={`/i/${bid}/inventory/adjustments`} label="Lịch sử" />
              </>
            )}
          </>
        )}
      </div>

      {/* right group: refresh */}
      {rightSlot}
    </div>
  );
}