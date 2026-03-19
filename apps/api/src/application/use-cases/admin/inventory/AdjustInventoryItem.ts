import type {
  AdjustInventoryIngredientInput,
  IInventoryIngredientRepository,
} from "../../../ports/repositories/IInventoryIngredientRepository.js";
import type { IMenuRecipeRepository } from "../../../ports/repositories/IMenuRecipeRepository.js";

type SyncHooks = {
  bumpMenuVersion?: (() => Promise<unknown>) | null;
  triggerStockRehydrate?: (() => Promise<unknown>) | null;
};

export class AdjustInventoryItem {
  constructor(
    private readonly repo: IInventoryIngredientRepository,
    private readonly menuRecipeRepo: IMenuRecipeRepository,
    private readonly syncHooks: SyncHooks = {},
  ) {}

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

    const out = await this.repo.adjust({
      ingredientId: String(input.ingredientId),
      branchId,
      adjustmentType: input.adjustmentType,
      quantity: Number(input.quantity),
      reason: input.reason ?? null,
      actorType: String(input.actor.actorType ?? ""),
      actorId: input.actor.actorId ? String(input.actor.actorId) : null,
    });

    const affectedMenuItemIds = await this.menuRecipeRepo.listMenuItemIdsByIngredient(
      branchId,
      String(input.ingredientId),
    );

    if (affectedMenuItemIds.length > 0) {
      for (const menuItemId of affectedMenuItemIds) {
        await this.menuRecipeRepo.recomputeAndSyncMenuItemStock(branchId, menuItemId);
      }

      const afterSyncJobs: Promise<unknown>[] = [];

      if (this.syncHooks.bumpMenuVersion) {
        afterSyncJobs.push(this.syncHooks.bumpMenuVersion());
      }

      if (this.syncHooks.triggerStockRehydrate) {
        afterSyncJobs.push(this.syncHooks.triggerStockRehydrate());
      }

      await Promise.allSettled(afterSyncJobs);
    }

    return out;
  }
}