import type {
  IMenuRecipeRepository,
  SaveMenuRecipeLineInput,
} from "../../../ports/repositories/IMenuRecipeRepository.js";

type SyncHooks = {
  bumpMenuVersion?: (() => Promise<unknown>) | null;
  triggerStockRehydrate?: (() => Promise<unknown>) | null;
};

export class SaveMenuItemRecipe {
  constructor(
    private readonly repo: IMenuRecipeRepository,
    private readonly syncHooks: SyncHooks = {},
  ) {}

  async execute(input: {
    menuItemId: string;
    branchId: string;
    lines: SaveMenuRecipeLineInput[];
    actor: { role: string; branchId: string | null };
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = String(input.branchId ?? "");

    if (!input.menuItemId?.trim()) throw new Error("VALIDATION_ERROR");
    if (!Array.isArray(input.lines)) throw new Error("VALIDATION_ERROR");

    if (actorRole === "BRANCH_MANAGER" || actorRole === "STAFF") {
      branchId = String(input.actor.branchId ?? "");
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");

    const normalizedLines = input.lines.map((line) => ({
      ingredientId: String(line.ingredientId),
      qtyPerItem: Number(line.qtyPerItem),
      unit: String(line.unit ?? "").trim(),
    }));

    for (const line of normalizedLines) {
      if (!line.ingredientId) throw new Error("VALIDATION_ERROR");
      if (!line.unit) throw new Error("VALIDATION_ERROR");
      if (!Number.isFinite(line.qtyPerItem) || line.qtyPerItem <= 0) {
        throw new Error("VALIDATION_ERROR");
      }
    }

    const seen = new Set<string>();
    for (const line of normalizedLines) {
      if (seen.has(line.ingredientId)) {
        const err: any = new Error("DUPLICATE_RECIPE_INGREDIENT");
        err.status = 409;
        err.code = "DUPLICATE_RECIPE_INGREDIENT";
        err.details = { ingredientId: line.ingredientId };
        throw err;
      }
      seen.add(line.ingredientId);
    }

    const saved = await this.repo.saveByMenuItemId({
      menuItemId: String(input.menuItemId),
      branchId,
      lines: normalizedLines,
    });

    await this.repo.recomputeAndSyncMenuItemStock(branchId, String(input.menuItemId));

    const afterSyncJobs: Promise<unknown>[] = [];

    if (this.syncHooks.bumpMenuVersion) {
      afterSyncJobs.push(this.syncHooks.bumpMenuVersion());
    }

    if (this.syncHooks.triggerStockRehydrate) {
      afterSyncJobs.push(this.syncHooks.triggerStockRehydrate());
    }

    await Promise.allSettled(afterSyncJobs);

    return saved;
  }
}