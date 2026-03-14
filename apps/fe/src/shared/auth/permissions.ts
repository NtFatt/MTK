import type { AuthSession } from "./types";

export function hasPermission(
  session: AuthSession | null | undefined,
  permission: string,
) {
  if (!session) return false;
  return session.permissions.includes(permission);
}

export function hasAnyPermission(
  session: AuthSession | null | undefined,
  permissions: string[],
) {
  if (!session) return false;
  return permissions.some((permission) => session.permissions.includes(permission));
}

export function hasAllPermissions(
  session: AuthSession | null | undefined,
  permissions: string[],
) {
  if (!session) return false;
  return permissions.every((permission) => session.permissions.includes(permission));
}

export function isAdminSession(session: AuthSession | null | undefined) {
  return session?.role === "ADMIN";
}

export function isInternalBranchMismatch(
  session: AuthSession | null | undefined,
  urlBranchId: string | null | undefined,
) {
  if (!session || !urlBranchId) return false;
  if (session.role === "ADMIN") return false;
  return String(session.branchId) !== String(urlBranchId);
}

export function resolveInternalBranch(
  session: AuthSession | null | undefined,
  urlBranchId: string | null | undefined,
) {
  const trimmedUrlBranchId = String(urlBranchId ?? "").trim();

  if (session?.role === "ADMIN") {
    return trimmedUrlBranchId || String(session.branchId ?? "");
  }

  return String(session?.branchId ?? trimmedUrlBranchId ?? "");
}