import { hasInternalPermission, isInternalRole } from "@hadilao/contracts";
import type { AuthSession } from "./types";

export function isAdminSession(session: AuthSession | null | undefined) {
  return session?.role === "ADMIN";
}

export function hasPermission(
  session: AuthSession | null | undefined,
  permission: string,
) {
  if (!session) return false;
  if (session.permissions.includes(permission)) return true;
  return isInternalRole(session.role) ? hasInternalPermission(session.role, permission) : false;
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
