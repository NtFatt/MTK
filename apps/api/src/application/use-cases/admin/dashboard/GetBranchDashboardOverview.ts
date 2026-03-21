import type { IAdminDashboardRepository } from "../../../ports/repositories/IAdminDashboardRepository.js";

type Actor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
};

export class GetBranchDashboardOverview {
  constructor(private readonly repo: IAdminDashboardRepository) {}

  async execute(input: {
    actor: Actor;
    branchId?: string | null;
  }) {
    let branchId = input.branchId ?? null;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = input.actor.branchId;
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");
    return this.repo.getOverview({ branchId: String(branchId) });
  }
}
