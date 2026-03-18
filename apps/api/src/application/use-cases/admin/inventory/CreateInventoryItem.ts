import type {
  CreateInventoryIngredientInput,
  IInventoryIngredientRepository,
} from "../../../ports/repositories/IInventoryIngredientRepository.js";

export class CreateInventoryItem {
  constructor(private readonly repo: IInventoryIngredientRepository) {}

  async execute(input: CreateInventoryIngredientInput & {
    actor: { role: string; branchId: string | null };
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = String(input.branchId ?? "");

    if (!input.ingredientCode?.trim()) throw new Error("VALIDATION_ERROR");
    if (!input.ingredientName?.trim()) throw new Error("VALIDATION_ERROR");
    if (!input.unit?.trim()) throw new Error("VALIDATION_ERROR");

    if (input.currentQty < 0 || input.warningThreshold < 0 || input.criticalThreshold < 0) {
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

    return this.repo.create({
      branchId,
      ingredientCode: input.ingredientCode.trim(),
      ingredientName: input.ingredientName.trim(),
      unit: input.unit.trim(),
      currentQty: Number(input.currentQty),
      warningThreshold: Number(input.warningThreshold),
      criticalThreshold: Number(input.criticalThreshold),
      isActive: Boolean(input.isActive),
    });
  }
}