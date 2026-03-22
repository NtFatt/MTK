import type { IMenuCategoryRepository } from "../../../ports/repositories/IMenuCategoryRepository.js";

type AdminMenuCategoryRepository = IMenuCategoryRepository & {
  findById(categoryId: string): Promise<{ id: string; name: string } | null>;
  countItems(categoryId: string): Promise<number>;
  deleteCategory(categoryId: string): Promise<boolean>;
};

function appError(code: string, status: number, details?: Record<string, unknown>) {
  const err = new Error(code) as Error & {
    status: number;
    code: string;
    details?: Record<string, unknown>;
  };

  err.status = status;
  err.code = code;

  if (details !== undefined) {
    err.details = details;
  }

  return err;
}

export class DeleteMenuCategory {
  constructor(private readonly repo: AdminMenuCategoryRepository) {}

  async execute(input: { categoryId: string }) {
    const categoryId = String(input.categoryId ?? "").trim();
    if (!categoryId) {
      throw appError("CATEGORY_ID_REQUIRED", 400);
    }

    const existing = await this.repo.findById(categoryId);
    if (!existing) {
      throw appError("MENU_CATEGORY_NOT_FOUND", 404, { categoryId });
    }

    const itemCount = await this.repo.countItems(categoryId);
    if (itemCount > 0) {
      throw appError("CATEGORY_HAS_ITEMS", 409, { categoryId, itemCount });
    }

    const deleted = await this.repo.deleteCategory(categoryId);
    if (!deleted) {
      throw appError("MENU_CATEGORY_NOT_FOUND", 404, { categoryId });
    }

    return {
      id: existing.id,
      name: existing.name,
    };
  }
}
