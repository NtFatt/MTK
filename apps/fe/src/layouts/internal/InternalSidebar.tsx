import { useState } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../shared/auth/authStore";
import {
  hasAnyPermission,
  hasPermission,
} from "../../shared/auth/permissions";
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
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  const session = useStore(authStore, (s) => s.session);

  const base = branchId ? `/i/${branchId}` : "/i";
  const adminBase = `${base}/admin`;

  const invStock = `${adminBase}/inventory/stock`;
  const invHolds = `${adminBase}/inventory/holds`;
  const invAdj = `${adminBase}/inventory/adjustments`;

  const invIngredients = `${adminBase}/inventory/items`;
  const invAlerts = `${adminBase}/inventory/alerts`;
  const recipeRoute = `${adminBase}/inventory/recipes`;
  const reservationsRoute = `${adminBase}/reservations`;
  const maintenanceRoute = `${adminBase}/maintenance`;

  const isInventoryRoute = loc.pathname.includes("/admin/inventory/");
  const [invOpen, setInvOpen] = useState(isInventoryRoute);

  const showInventoryChildren = invOpen || isInventoryRoute;
  const showReservations = hasAnyPermission(session, [
    "reservations.confirm",
    "reservations.checkin",
  ]);
  const showMaintenance = hasPermission(session, "maintenance.run");
  const observabilityRoute = `${adminBase}/observability`;
  const showObservability = hasPermission(session, "observability.admin.read");

  const canReadInventory = hasPermission(session, "inventory.read");
  const canManageMenu = hasPermission(session, "menu.manage");
  const canManagePromotions = hasPermission(session, "promotions.manage");

  const menuManagementRoute = `${adminBase}/menu`;
  const voucherManagementRoute = `${adminBase}/vouchers`;

  const realtimeRoute = `${adminBase}/realtime`;
  const showRealtime = hasPermission(session, "realtime.admin");
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

          {canManageMenu && (
            <NavItem to={menuManagementRoute} label="Quản lý món" />
          )}

          {canManagePromotions && (
            <NavItem to={voucherManagementRoute} label="Voucher" />
          )}

          <button
            type="button"
            onClick={() => setInvOpen((v) => !v)}
            className={cn(
              "mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
              isInventoryRoute
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>Kho nguyên liệu</span>
            <span className="text-xs">{showInventoryChildren ? "▾" : "▸"}</span>
          </button>

          {showInventoryChildren && (
            <div className="ml-2 mt-1 space-y-1 border-l pl-2">
              {canReadInventory && <NavItem to={invIngredients} label="Nguyên liệu" />}
              {canManageMenu && <NavItem to={recipeRoute} label="Công thức món" />}
              {canReadInventory && <NavItem to={invAlerts} label="Cảnh báo tồn" />}
              <NavItem to={invStock} label="Tồn kho món" />
              <NavItem to={invHolds} label="Holds" />
              <NavItem to={invAdj} label="Lịch sử điều chỉnh" />
            </div>
          )}
          {showReservations && (
            <NavItem to={reservationsRoute} label="Reservations" />
          )}
          {showMaintenance && (
            <NavItem to={maintenanceRoute} label="Maintenance" />
          )}
          {showObservability && (
            <NavItem to={observabilityRoute} label="Observability" />
          )}
          {showRealtime && (
            <NavItem to={realtimeRoute} label="Realtime Admin" />
          )}
        </nav>
        <div className="border-t px-3 py-3 text-xs text-muted-foreground">
          v0.1 • internal
        </div>
      </div>
    </aside>
  );
}
