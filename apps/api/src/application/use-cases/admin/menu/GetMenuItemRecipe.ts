import type { IMenuRecipeRepository } from "../../../ports/repositories/IMenuRecipeRepository.js";

export class GetMenuItemRecipe {
    constructor(private readonly repo: IMenuRecipeRepository) { }

    async execute(input: {
        menuItemId: string;
        branchId: string;
        actor: { role: string; branchId: string | null };
    }) {
        const actorRole = String(input.actor.role ?? "").toUpperCase();
        let branchId = String(input.branchId ?? "");

        if (!input.menuItemId?.trim()) throw new Error("VALIDATION_ERROR");

        if (actorRole === "BRANCH_MANAGER" || actorRole === "STAFF") {
            branchId = String(input.actor.branchId ?? "");
        }

        if (!branchId) throw new Error("BRANCH_REQUIRED");

        return this.repo.getByMenuItemId(String(input.menuItemId), branchId);
    }
}