/**
 * Runtime-safe RBAC mirror for the API.
 *
 * Note:
 * - FE/contracts use packages/contracts/src/rbac.ts
 * - API keeps a local mirror because tsx dev runtime currently does not
 *   reliably resolve the contracts subpath exports in watch mode.
 * - Keep this file aligned with packages/contracts/src/rbac.ts.
 */

export type InternalRole = "ADMIN" | "BRANCH_MANAGER" | "STAFF" | "KITCHEN" | "CASHIER";

export type Permission =
  | "orders.read"
  | "orders.status.change"
  | "attendance.read"
  | "attendance.manage"
  | "payroll.read"
  | "payroll.manage"
  | "payroll.bonus.manage"
  | "shifts.read"
  | "shifts.open"
  | "shifts.close"
  | "reservations.confirm"
  | "reservations.checkin"
  | "ops.tables.read"
  | "ops.tables.manage"
  | "ops.sessions.open"
  | "ops.sessions.close"
  | "ops.carts.get"
  | "ops.carts.items.upsert"
  | "ops.orders.create"
  | "kitchen.queue.read"
  | "cashier.unpaid.read"
  | "cashier.settle_cash"
  | "payments.mock_success"
  | "inventory.holds.read"
  | "maintenance.run"
  | "observability.metrics.read"
  | "staff.read"
  | "staff.manage"
  | "inventory.read"
  | "inventory.adjust"
  | "menu.manage"
  | "promotions.manage"
  | "realtime.admin"
  | "observability.admin.read";

export const ROLE_PERMISSIONS: Record<InternalRole, readonly Permission[]> = {
  ADMIN: [
    "orders.read",
    "orders.status.change",
    "attendance.read",
    "attendance.manage",
    "payroll.read",
    "payroll.manage",
    "payroll.bonus.manage",
    "shifts.read",
    "shifts.open",
    "shifts.close",
    "reservations.confirm",
    "reservations.checkin",
    "ops.tables.read",
    "ops.tables.manage",
    "ops.sessions.open",
    "ops.sessions.close",
    "ops.carts.get",
    "ops.carts.items.upsert",
    "ops.orders.create",
    "kitchen.queue.read",
    "cashier.unpaid.read",
    "cashier.settle_cash",
    "payments.mock_success",
    "inventory.holds.read",
    "maintenance.run",
    "observability.metrics.read",
    "staff.read",
    "staff.manage",
    "inventory.read",
    "inventory.adjust",
    "menu.manage",
    "promotions.manage",
    "realtime.admin",
    "observability.admin.read",
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
    "ops.tables.manage",
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
  STAFF: [
    "orders.read",
    "reservations.confirm",
    "reservations.checkin",
    "ops.tables.read",
    "ops.sessions.open",
    "ops.sessions.close",
    "ops.carts.get",
    "ops.carts.items.upsert",
    "ops.orders.create",
  ],
  KITCHEN: [
    "orders.status.change",
    "kitchen.queue.read",
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
};

const ROLE_PERMISSION_SETS: Record<InternalRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(ROLE_PERMISSIONS.ADMIN),
  BRANCH_MANAGER: new Set(ROLE_PERMISSIONS.BRANCH_MANAGER),
  STAFF: new Set(ROLE_PERMISSIONS.STAFF),
  KITCHEN: new Set(ROLE_PERMISSIONS.KITCHEN),
  CASHIER: new Set(ROLE_PERMISSIONS.CASHIER),
};

export function hasPermission(role: string, permission: Permission): boolean {
  const normalizedRole = String(role ?? "").trim().toUpperCase() as InternalRole;
  const permissions = ROLE_PERMISSION_SETS[normalizedRole];
  return Boolean(permissions?.has(permission));
}
