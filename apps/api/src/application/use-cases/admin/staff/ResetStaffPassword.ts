import type { IStaffUserRepository } from "../../../ports/repositories/IStaffUserRepository.js";
import { hashPassword } from "../../../../infrastructure/security/password.js";
import { canManageTargetStaff } from "../../../../domain/policies/staffManagementPolicy.js";

export class ResetStaffPassword {
  constructor(private readonly staffRepo: IStaffUserRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    staffId: string;
    newPassword: string;
  }) {
    if (!input.newPassword || input.newPassword.length < 4) throw new Error("VALIDATION_ERROR");

    const target = await this.staffRepo.findById(input.staffId);
    if (!target) {
      const err: any = new Error("NOT_FOUND");
      err.status = 404;
      err.code = "NOT_FOUND";
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

    const hash = hashPassword(input.newPassword);
    await this.staffRepo.updatePasswordHash(input.staffId, hash);
    return { ok: true, staffId: input.staffId };
  }
}
