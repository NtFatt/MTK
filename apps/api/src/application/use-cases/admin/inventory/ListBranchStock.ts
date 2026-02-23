import type { IInventoryRepository } from "../../../ports/repositories/IInventoryRepository.js";

export class ListBranchStock {
  constructor(private readonly repo: IInventoryRepository) {}

  async execute(input: { actor: { role: string; branchId: string | null }; branchId: string | null }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = input.branchId;

    if (actorRole === "BRANCH_MANAGER") {
      branchId = input.actor.branchId;
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const rows = await this.repo.listBranchStock(branchId);
    return rows;
  }
}
