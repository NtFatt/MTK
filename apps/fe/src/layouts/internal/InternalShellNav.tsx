import { NavLink, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../shared/auth/authStore";
import {
  hasAnyPermission,
  hasPermission,
  resolveInternalBranch,
} from "../../shared/auth/permissions";
import { cn } from "../../shared/utils/cn";

function Btn({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted",
          isActive ? "bg-muted" : "",
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

  const bid = resolveInternalBranch(session, branchId);

  const items = [
    {
      key: "tables",
      to: `/i/${bid}/tables`,
      label: "Tables",
      show: hasPermission(session, "ops.tables.read"),
    },
    {
      key: "cashier",
      to: `/i/${bid}/cashier`,
      label: "Cashier",
      show: hasPermission(session, "cashier.unpaid.read"),
    },
    {
      key: "kitchen",
      to: `/i/${bid}/kitchen`,
      label: "Kitchen",
      show: hasPermission(session, "kitchen.queue.read"),
    },
    {
      key: "inventory-stock",
      to: `/i/${bid}/inventory/stock`,
      label: "Tồn kho",
      show: hasPermission(session, "inventory.read"),
    },
    {
      key: "inventory-holds",
      to: `/i/${bid}/inventory/holds`,
      label: "Holds",
      show: hasPermission(session, "inventory.holds.read"),
    },
    {
      key: "inventory-adjustments",
      to: `/i/${bid}/inventory/adjustments`,
      label: "Lịch sử",
      show: hasPermission(session, "inventory.adjust"),
    },
    {
      key: "admin-dashboard",
      to: `/i/${bid}/admin/dashboard`,
      label: "Admin",
      show: hasAnyPermission(session, [
        "staff.manage",
        "maintenance.run",
        "observability.admin.read",
        "realtime.admin",
        "payments.mock_success",
      ]),
    },
  ].filter((item) => item.show);

  return (
    <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <Btn key={item.key} to={item.to} label={item.label} />
        ))}
      </div>

      {rightSlot}
    </div>
  );
}