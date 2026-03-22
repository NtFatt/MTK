import type { AuthSession, Role } from "./types";

const ROLE_PERMISSION_FALLBACKS: Partial<Record<Role, readonly string[]>> = {
  STAFF: [
    "orders.read",
    "ops.tables.read",
    "ops.sessions.open",
    "ops.sessions.close",
    "ops.carts.get",
    "ops.carts.items.upsert",
    "ops.orders.create",
    "reservations.confirm",
    "reservations.checkin",
  ],
  KITCHEN: [
    "kitchen.queue.read",
    "orders.status.change",
    "shifts.read",
    "shifts.open",
    "shifts.close",
  ],
  CASHIER: [
    "cashier.unpaid.read",
    "cashier.settle_cash",
    "shifts.read",
    "shifts.open",
    "shifts.close",
  ],
  BRANCH_MANAGER: [
    "orders.read",
    "orders.status.change",
    "attendance.read",
    "attendance.manage",
    "payroll.read",
    "payroll.bonus.manage",
    "shifts.read",
    "shifts.open",
    "shifts.close",
    "reservations.confirm",
    "reservations.checkin",
    "ops.tables.read",
    "ops.sessions.open",
    "ops.sessions.close",
    "ops.carts.get",
    "ops.carts.items.upsert",
    "ops.orders.create",
    "kitchen.queue.read",
    "cashier.unpaid.read",
    "cashier.settle_cash",
    "inventory.holds.read",
    "observability.metrics.read",
    "staff.read",
    "inventory.read",
    "inventory.adjust",
    "menu.manage",
    "promotions.manage",
  ],
};

export function isAdminSession(session: AuthSession | null | undefined) {
  return session?.role === "ADMIN";
}

export function hasPermission(
  session: AuthSession | null | undefined,
  permission: string,
) {
  if (!session) return false;
  if (isAdminSession(session)) return true;
  if (session.permissions.includes(permission)) return true;
  return ROLE_PERMISSION_FALLBACKS[session.role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  session: AuthSession | null | undefined,
  permissions: string[],
) {
  if (!session) return false;
  return permissions.some((permission) => hasPermission(session, permission));
}

export function hasAllPermissions(
  session: AuthSession | null | undefined,
  permissions: string[],
) {
  if (!session) return false;
  return permissions.every((permission) => hasPermission(session, permission));
}

export function isInternalBranchMismatch(
  session: AuthSession | null | undefined,
  urlBranchId: string | null | undefined,
) {
  if (!session || !urlBranchId) return false;
  if (isAdminSession(session)) return false;
  return String(session.branchId) !== String(urlBranchId);
}

export function resolveInternalBranch(
  session: AuthSession | null | undefined,
  urlBranchId: string | null | undefined,
) {
  const trimmedUrlBranchId = String(urlBranchId ?? "").trim();

  if (isAdminSession(session)) {
    return trimmedUrlBranchId || String(session?.branchId ?? "");
  }

  return String(session?.branchId ?? trimmedUrlBranchId ?? "");
}
