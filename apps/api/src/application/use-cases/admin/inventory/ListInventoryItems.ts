import type { IInventoryIngredientRepository } from "../../../ports/repositories/IInventoryIngredientRepository.js";

export class ListInventoryItems {
  constructor(private readonly repo: IInventoryIngredientRepository) {}

  async execute(input: {
    branchId: string;
    actor: { role: string; branchId: string | null };
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = String(input.branchId ?? "");

    if (actorRole === "BRANCH_MANAGER" || actorRole === "STAFF") {
      branchId = String(input.actor.branchId ?? "");
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");

    return this.repo.listByBranch(branchId);
  }
}