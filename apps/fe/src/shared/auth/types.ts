/**
 * Auth session and role types. Align with .cursorrules and RBAC.
 */
export type Role =
  | "PUBLIC"
  | "CLIENT"
  | "STAFF"
  | "KITCHEN"
  | "CASHIER"
  | "BRANCH_MANAGER"
  | "ADMIN";

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user: { id: string; fullName?: string };
  role: Role;
  permissions: string[];
  branchId?: number | string;
  expiresAt?: number;
};
