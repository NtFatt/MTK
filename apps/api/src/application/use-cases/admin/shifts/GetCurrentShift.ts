import type { IShiftRepository } from "../../../ports/repositories/IShiftRepository.js";
import type { IStaffShiftAssignmentRepository } from "../../../ports/repositories/IStaffShiftAssignmentRepository.js";
import type { ShiftCode } from "../../../../domain/shifts/templates.js";

export class GetCurrentShift {
  constructor(
    private readonly shiftRepo: IShiftRepository,
    private readonly assignmentRepo: IStaffShiftAssignmentRepository,
  ) {}

  async execute(input: {
    actor: { actorType: "ADMIN" | "STAFF"; role: string; userId: string; branchId: string | null };
    branchId: string;
    businessDate?: string | null;
  }) {
    const branchId = String(input.branchId ?? "").trim();
    if (!branchId) throw new Error("BRANCH_REQUIRED");
    const businessDate = String(input.businessDate ?? "").trim();

    const [current, templates] = await Promise.all([
      this.shiftRepo.getCurrent(branchId),
      this.shiftRepo.listTemplates(branchId),
    ]);

    let actorSchedule: {
      businessDate: string;
      isPrivileged: boolean;
      assignedShiftCodes: ShiftCode[];
    } | null = null;

    if (businessDate && input.actor.actorType === "STAFF" && input.actor.userId) {
      const isPrivileged = String(input.actor.role ?? "").toUpperCase() === "BRANCH_MANAGER";
      const assignments = isPrivileged
        ? []
        : await this.assignmentRepo.listForStaffDate({
            branchId,
            staffId: input.actor.userId,
            businessDate,
          });

      actorSchedule = {
        businessDate,
        isPrivileged,
        assignedShiftCodes: assignments.map((assignment) => assignment.shiftCode),
      };
    }

    return { current, templates, actorSchedule };
  }
}
