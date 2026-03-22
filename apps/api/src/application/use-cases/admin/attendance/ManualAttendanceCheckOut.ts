import type { IAttendanceRepository } from "../../../ports/repositories/IAttendanceRepository.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class ManualAttendanceCheckOut {
  constructor(private readonly attendanceRepo: IAttendanceRepository) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    attendanceId: string;
    performedAt: string;
    note: string;
    expectedVersion?: number | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);
    if (!scopedBranchId) throw new Error("FORBIDDEN");

    return this.attendanceRepo.manualCheckOut({
      branchId: scopedBranchId,
      attendanceId: input.attendanceId,
      performedAt: input.performedAt,
      note: input.note,
      expectedVersion: input.expectedVersion ?? null,
      actor: {
        actorType: input.actor.actorType,
        actorId: input.actor.userId,
        actorName: input.actor.username,
      },
    });
  }
}
