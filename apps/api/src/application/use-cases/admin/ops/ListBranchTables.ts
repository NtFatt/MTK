import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";

type Actor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
};

export class ListBranchTables {
  constructor(private readonly repo: ITableRepository) {}

  async execute(input: {
    actor: Actor;
    branchId?: string | null;
  }) {
    let branchId = input.branchId ?? null;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = input.actor.branchId;
    }

    const rows = branchId ? await this.repo.findAllByBranch(branchId) : await this.repo.findAll();

    return rows.map((t) => ({
      tableId: t.id,
      branchId: t.branchId,
      tableCode: t.tableCode,
      areaName: t.areaName,
      seats: t.seats,
      tableStatus: t.status,
      directionId: t.directionId,
    }));
  }
}
