import type { IAttendanceRepository } from "../../../ports/repositories/IAttendanceRepository.js";
import type { IStaffUserRepository } from "../../../ports/repositories/IStaffUserRepository.js";
import type { ShiftCode } from "../../../../domain/shifts/templates.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class ManualAttendanceCheckIn {
  constructor(
    private readonly attendanceRepo: IAttendanceRepository,
    private readonly staffRepo: IStaffUserRepository,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    performedAt: string;
    note: string;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    const staff = await this.staffRepo.findById(input.staffId);
    if (!staff) throw new Error("STAFF_NOT_FOUND");
    if (String(staff.branchId ?? "") !== scopedBranchId) throw new Error("FORBIDDEN");
    if (staff.status !== "ACTIVE") throw new Error("STAFF_NOT_ACTIVE");

    return this.attendanceRepo.manualCheckIn({
      branchId: scopedBranchId,
      staffId: input.staffId,
      businessDate: input.businessDate,
      shiftCode: input.shiftCode,
      performedAt: input.performedAt,
      note: input.note,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
        actorName: input.actor.username,
      },
    });
  }
}
