export const INTERNAL_ROLES = [
  "ADMIN",
  "BRANCH_MANAGER",
  "STAFF",
  "KITCHEN",
  "CASHIER",
] as const;

export type InternalRole = typeof INTERNAL_ROLES[number];

export const INTERNAL_PERMISSIONS = [
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
] as const;

export type InternalPermission = typeof INTERNAL_PERMISSIONS[number];

export const ROLE_PERMISSIONS: Record<InternalRole, readonly InternalPermission[]> = {
  ADMIN: INTERNAL_PERMISSIONS,

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

const ROLE_PERMISSION_SETS: Record<InternalRole, ReadonlySet<InternalPermission>> = {
  ADMIN: new Set(ROLE_PERMISSIONS.ADMIN),
  BRANCH_MANAGER: new Set(ROLE_PERMISSIONS.BRANCH_MANAGER),
  STAFF: new Set(ROLE_PERMISSIONS.STAFF),
  KITCHEN: new Set(ROLE_PERMISSIONS.KITCHEN),
  CASHIER: new Set(ROLE_PERMISSIONS.CASHIER),
};

export function isInternalRole(role: string | null | undefined): role is InternalRole {
  const normalized = String(role ?? "").trim().toUpperCase();
  return INTERNAL_ROLES.includes(normalized as InternalRole);
}

export function getInternalRolePermissions(
  role: string | null | undefined,
): readonly InternalPermission[] {
  if (!isInternalRole(role)) return [];
  return ROLE_PERMISSIONS[role];
}

export function hasInternalPermission(
  role: string | null | undefined,
  permission: string,
): permission is InternalPermission {
  if (!isInternalRole(role)) return false;
  return ROLE_PERMISSION_SETS[role].has(permission as InternalPermission);
}
