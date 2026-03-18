import type {
  IInventoryIngredientRepository,
  UpdateInventoryIngredientInput,
} from "../../../ports/repositories/IInventoryIngredientRepository.js";

export class UpdateInventoryItem {
  constructor(private readonly repo: IInventoryIngredientRepository) {}

  async execute(input: UpdateInventoryIngredientInput & {
    actor: { role: string; branchId: string | null };
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = String(input.branchId ?? "");

    if (!input.ingredientId?.trim()) throw new Error("VALIDATION_ERROR");

    if (input.warningThreshold != null && input.warningThreshold < 0) {
      throw new Error("VALIDATION_ERROR");
    }
    if (input.criticalThreshold != null && input.criticalThreshold < 0) {
      throw new Error("VALIDATION_ERROR");
    }

    if (actorRole === "BRANCH_MANAGER" || actorRole === "STAFF") {
      if (!input.actor.branchId) {
        const err: any = new Error("BRANCH_SCOPE_REQUIRED");
        err.status = 403;
        err.code = "BRANCH_SCOPE_REQUIRED";
        throw err;
      }
      branchId = String(input.actor.branchId);
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const payload: UpdateInventoryIngredientInput = {
      ingredientId: String(input.ingredientId),
      branchId,
    };

    if (input.ingredientName !== undefined) {
      payload.ingredientName = input.ingredientName.trim();
    }

    if (input.unit !== undefined) {
      payload.unit = input.unit.trim();
    }

    if (input.warningThreshold !== undefined) {
      payload.warningThreshold = input.warningThreshold;
    }

    if (input.criticalThreshold !== undefined) {
      payload.criticalThreshold = input.criticalThreshold;
    }

    if (input.isActive !== undefined) {
      payload.isActive = input.isActive;
    }

    return this.repo.update(payload);
  }
}