import type {
  AdjustInventoryIngredientInput,
  IInventoryIngredientRepository,
} from "../../../ports/repositories/IInventoryIngredientRepository.js";

export class AdjustInventoryItem {
  constructor(private readonly repo: IInventoryIngredientRepository) {}

  async execute(input: Omit<AdjustInventoryIngredientInput, "actorType" | "actorId"> & {
    actor: {
      role: string;
      branchId: string | null;
      actorType: string;
      actorId: string | null;
    };
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = String(input.branchId ?? "");

    if (!input.ingredientId?.trim()) throw new Error("VALIDATION_ERROR");
    if (Number(input.quantity) < 0) throw new Error("VALIDATION_ERROR");

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

    return this.repo.adjust({
      ingredientId: String(input.ingredientId),
      branchId,
      adjustmentType: input.adjustmentType,
      quantity: Number(input.quantity),
      reason: input.reason ?? null,
      actorType: String(input.actor.actorType ?? ""),
      actorId: input.actor.actorId ? String(input.actor.actorId) : null,
    });
  }
}