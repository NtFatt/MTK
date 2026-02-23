import type { IStaffUserRepository, StaffUserRole } from "../../../ports/repositories/IStaffUserRepository.js";
import { canAssignStaffRole, canManageTargetStaff } from "../../../../domain/policies/staffManagementPolicy.js";

export class UpdateStaffRole {
  constructor(private readonly staffRepo: IStaffUserRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    staffId: string;
    role: StaffUserRole;
  }) {
    const target = await this.staffRepo.findById(input.staffId);
    if (!target) {
      const err: any = new Error("NOT_FOUND");
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }

    const newRole = String(input.role).toUpperCase() as StaffUserRole;
    if (!canAssignStaffRole(input.actor.role, newRole)) {
      const err: any = new Error("FORBIDDEN");
      err.status = 403;
      err.code = "FORBIDDEN";
      err.details = { reason: "ROLE_NOT_ASSIGNABLE", role: newRole };
      throw err;
    }

    if (!canManageTargetStaff({
      actorRole: input.actor.role,
      actorBranchId: input.actor.branchId,
      targetRole: target.role,
      targetBranchId: target.branchId,
    })) {
      const err: any = new Error("FORBIDDEN");
      err.status = 403;
      err.code = "FORBIDDEN";
      err.details = { reason: "TARGET_NOT_MANAGEABLE" };
      throw err;
    }

    await this.staffRepo.updateRole(input.staffId, newRole);
    return { ok: true, staffId: input.staffId, role: newRole };
  }
}
