import type { InternalRole } from "./internalPermissions.js";
import type { StaffUserRole } from "../../application/ports/repositories/IStaffUserRepository.js";

export function canManageStaff(actorRole: string): boolean {
  const r = String(actorRole ?? "").toUpperCase() as InternalRole;
  return r === "ADMIN" || r === "BRANCH_MANAGER";
}

export function canAssignStaffRole(actorRole: string, targetRole: StaffUserRole): boolean {
  const r = String(actorRole ?? "").toUpperCase() as InternalRole;
  const tr = String(targetRole ?? "").toUpperCase() as StaffUserRole;

  if (r === "ADMIN") return true;
  if (r === "BRANCH_MANAGER") {
    // Branch managers cannot create/promote other branch managers.
    return tr !== "BRANCH_MANAGER";
  }
  return false;
}

export function canManageTargetStaff(input: {
  actorRole: string;
  actorBranchId: string | null;
  targetRole: StaffUserRole;
  targetBranchId: string | null;
}): boolean {
  const r = String(input.actorRole ?? "").toUpperCase() as InternalRole;
  const tr = String(input.targetRole ?? "").toUpperCase() as StaffUserRole;

  if (r === "ADMIN") return true;

  if (r === "BRANCH_MANAGER") {
    if (!input.actorBranchId || !input.targetBranchId) return false;
    if (String(input.actorBranchId) !== String(input.targetBranchId)) return false;
    // Cannot manage another branch manager.
    if (tr === "BRANCH_MANAGER") return false;
    return true;
  }

  return false;
}
