import type { MenuCategory } from "../../../../domain/entities/MenuCategory.js";
import type { IMenuCategoryRepository } from "../../../ports/repositories/IMenuCategoryRepository.js";

type AdminMenuCategoryRepository = IMenuCategoryRepository & {
  findById(categoryId: string): Promise<MenuCategory | null>;
  findByName(name: string, excludeCategoryId?: string | null): Promise<MenuCategory | null>;
  updateCategory(input: {
    categoryId: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<MenuCategory | null>;
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

function normalizeOptionalName(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return String(value ?? "").trim();
}

function normalizeOptionalSortOrder(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const sortOrder = Number(value);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    throw appError("INVALID_SORT_ORDER", 400, { sortOrder: value });
  }
  return sortOrder;
}

export class UpdateMenuCategory {
  constructor(private readonly repo: AdminMenuCategoryRepository) {}

  async execute(input: {
    categoryId: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const categoryId = String(input.categoryId ?? "").trim();
    if (!categoryId) {
      throw appError("CATEGORY_ID_REQUIRED", 400);
    }

    const existing = await this.repo.findById(categoryId);
    if (!existing) {
      throw appError("MENU_CATEGORY_NOT_FOUND", 404, { categoryId });
    }

    const patch: {
      categoryId: string;
      name?: string;
      sortOrder?: number;
      isActive?: boolean;
    } = { categoryId };

    const name = normalizeOptionalName(input.name);
    if (name !== undefined) {
      if (!name) {
        throw appError("CATEGORY_NAME_REQUIRED", 400);
      }
      if (name.length > 255) {
        throw appError("CATEGORY_NAME_TOO_LONG", 400);
      }

      const duplicate = await this.repo.findByName(name, categoryId);
      if (duplicate) {
        throw appError("CATEGORY_NAME_ALREADY_EXISTS", 409, { name });
      }

      patch.name = name;
    }

    const sortOrder = normalizeOptionalSortOrder(input.sortOrder);
    if (sortOrder !== undefined) {
      patch.sortOrder = sortOrder;
    }

    if (input.isActive !== undefined) {
      patch.isActive = Boolean(input.isActive);
    }

    if (patch.name === undefined && patch.sortOrder === undefined && patch.isActive === undefined) {
      throw appError("EMPTY_UPDATE_PAYLOAD", 400);
    }

    const updated = await this.repo.updateCategory(patch);
    if (!updated) {
      throw appError("MENU_CATEGORY_NOT_FOUND", 404, { categoryId });
    }

    return updated;
  }
}
