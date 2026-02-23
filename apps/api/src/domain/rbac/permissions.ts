/**
 * RBAC Single Source of Truth (M1)
 *
 * Rules:
 * - Permission names: domain.resource.action (no admin.* prefix)
 * - Route-level guard via requirePermission(permission)
 * - Use-case-level checks are defense-in-depth only
 */

export type InternalRole = "ADMIN" | "BRANCH_MANAGER" | "STAFF" | "KITCHEN" | "CASHIER";

// Core permissions (Spec v6.2 - Demo 10/10 - table 3)
export type Permission =
  | "orders.status.change"
  | "reservations.confirm"
  | "reservations.checkin"
  | "ops.tables.read"
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
  // Extended (non-core but present in current codebase)
  | "staff.read"
  | "staff.manage"
  | "inventory.read"
  | "inventory.adjust"
  | "menu.manage"
  | "realtime.admin"
  | "observability.admin.read";

export const ROLE_PERMISSIONS: Record<InternalRole, ReadonlySet<Permission>> = {
  // ADMIN = full access (core + extensions)
  ADMIN: new Set([
    "orders.status.change",
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
    "payments.mock_success",
    "inventory.holds.read",
    "maintenance.run",
    "observability.metrics.read",

    // extensions
    "staff.read",
    "staff.manage",
    "inventory.read",
    "inventory.adjust",
    "menu.manage",
    "realtime.admin",
    "observability.admin.read",
  ]),

  // BRANCH_MANAGER = operations + cashier + inventory holds + metrics + reservations
  BRANCH_MANAGER: new Set([
    "orders.status.change",
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

    // extensions
    "staff.read",
    "inventory.read",
    // Demo 10/10: Branch manager can adjust branch stock (branch-scoped in use-case)
    "inventory.adjust",
    // Demo 10/10: Branch manager can invalidate menu cache version.
    "menu.manage",
  ]),

  // STAFF (service) = ops + reservations
  STAFF: new Set([
    "reservations.confirm",
    "reservations.checkin",
    "ops.tables.read",
    "ops.sessions.open",
    "ops.sessions.close",
    "ops.carts.get",
    "ops.carts.items.upsert",
    "ops.orders.create",
  ]),

  // KITCHEN = kitchen queue + change status
  KITCHEN: new Set(["orders.status.change", "kitchen.queue.read"]),

  // CASHIER = unpaid + settle
  CASHIER: new Set(["cashier.unpaid.read", "cashier.settle_cash"]),
};

export function hasPermission(role: string, permission: Permission): boolean {
  const r = String(role ?? "").toUpperCase() as InternalRole;
  const set = ROLE_PERMISSIONS[r];
  return Boolean(set && set.has(permission));
}
