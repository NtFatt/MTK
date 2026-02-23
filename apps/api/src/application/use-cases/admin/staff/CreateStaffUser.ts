import type { IStaffUserRepository, StaffUserRole } from "../../../ports/repositories/IStaffUserRepository.js";
import { hashPassword } from "../../../../infrastructure/security/password.js";
import { canAssignStaffRole } from "../../../../domain/policies/staffManagementPolicy.js";

export class CreateStaffUser {
  constructor(private readonly staffRepo: IStaffUserRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    username: string;
    password: string;
    role: StaffUserRole;
    branchId: string;
    fullName: string | null;
  }) {
    if (!input.username?.trim()) throw new Error("VALIDATION_ERROR");
    if (!input.password || input.password.length < 4) throw new Error("VALIDATION_ERROR");

    const role = String(input.role).toUpperCase() as StaffUserRole;
    if (!canAssignStaffRole(input.actor.role, role)) {
      const err: any = new Error("FORBIDDEN");
      err.status = 403;
      err.code = "FORBIDDEN";
      err.details = { reason: "ROLE_NOT_ASSIGNABLE", role };
      throw err;
    }

    // Branch manager can only create staff for own branch (branch-scoped).
    if (String(input.actor.role).toUpperCase() === "BRANCH_MANAGER") {
      if (!input.actor.branchId) {
        const err: any = new Error("FORBIDDEN");
        err.status = 403;
        err.code = "FORBIDDEN";
        err.details = { reason: "BRANCH_SCOPE_REQUIRED" };
        throw err;
      }
      if (String(input.branchId) !== String(input.actor.branchId)) {
        const err: any = new Error("FORBIDDEN");
        err.status = 403;
        err.code = "FORBIDDEN";
        err.details = { reason: "BRANCH_SCOPE_MISMATCH" };
        throw err;
      }
    }

    const passwordHash = hashPassword(input.password);
    const created = await this.staffRepo.create({
      username: input.username.trim(),
      passwordHash,
      fullName: input.fullName,
      role,
      branchId: String(input.branchId),
    });

    // Never return password hash.
    return {
      staffId: created.staffId,
      username: created.username,
      fullName: created.fullName,
      role: created.role,
      status: created.status,
      branchId: created.branchId,
    };
  }
}
