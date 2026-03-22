import type { IAttendanceRepository } from "../../../ports/repositories/IAttendanceRepository.js";
import type { IStaffUserRepository } from "../../../ports/repositories/IStaffUserRepository.js";

export class ListStaffAttendanceHistory {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly staffRepo: IStaffUserRepository,
  ) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId: string;
    staffId: string;
    limit: number;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    const staff = await this.staffRepo.findById(input.staffId);
    if (!staff) throw new Error("STAFF_NOT_FOUND");
    if (String(staff.branchId ?? "") !== scopedBranchId) throw new Error("FORBIDDEN");

    return this.attendanceRepo.listStaffHistory({
      branchId: scopedBranchId,
      staffId: input.staffId,
      limit: input.limit,
    });
  }
}
