import type { IStaffUserRepository, StaffUserStatus } from "../../../ports/repositories/IStaffUserRepository.js";

export class ListStaffUsers {
  constructor(private readonly staffRepo: IStaffUserRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId?: string | null;
    status?: StaffUserStatus | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId: string | null | undefined = input.branchId;

    if (actorRole === "BRANCH_MANAGER") {
      // hard enforce branch scope
      branchId = input.actor.branchId;
    }

    const rows = await this.staffRepo.list({
      branchId: branchId ?? null,
      status: input.status ?? null,
    });

    return rows.map((r) => ({
      staffId: r.staffId,
      username: r.username,
      fullName: r.fullName,
      role: r.role,
      status: r.status,
      branchId: r.branchId,
    }));
  }
}
