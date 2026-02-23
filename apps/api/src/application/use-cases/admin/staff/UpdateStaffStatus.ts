import type { IStaffUserRepository, StaffUserStatus } from "../../../ports/repositories/IStaffUserRepository.js";
import { canManageTargetStaff } from "../../../../domain/policies/staffManagementPolicy.js";

export class UpdateStaffStatus {
  constructor(private readonly staffRepo: IStaffUserRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    staffId: string;
    status: StaffUserStatus;
  }) {
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

    const status = String(input.status).toUpperCase() as StaffUserStatus;
    await this.staffRepo.updateStatus(input.staffId, status);
    return { ok: true, staffId: input.staffId, status };
  }
}
