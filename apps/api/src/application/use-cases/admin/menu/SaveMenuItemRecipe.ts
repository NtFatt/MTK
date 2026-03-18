import type {
  IMenuRecipeRepository,
  SaveMenuRecipeLineInput,
} from "../../../ports/repositories/IMenuRecipeRepository.js";

export class SaveMenuItemRecipe {
  constructor(private readonly repo: IMenuRecipeRepository) {}

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

    return this.repo.saveByMenuItemId({
      menuItemId: String(input.menuItemId),
      branchId,
      lines: normalizedLines,
    });
  }
}