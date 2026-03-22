import type { MenuCategory } from "../../../../domain/entities/MenuCategory.js";
import type { IMenuCategoryRepository } from "../../../ports/repositories/IMenuCategoryRepository.js";

type AdminMenuCategoryRepository = IMenuCategoryRepository & {
  findByName(name: string, excludeCategoryId?: string | null): Promise<MenuCategory | null>;
  createCategory(input: {
    name: string;
    sortOrder: number;
    isActive: boolean;
  }): Promise<MenuCategory>;
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

function normalizeName(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeSortOrder(value: unknown): number {
  const sortOrder = Number(value ?? 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    throw appError("INVALID_SORT_ORDER", 400, { sortOrder: value });
  }
  return sortOrder;
}

export class CreateMenuCategory {
  constructor(private readonly repo: AdminMenuCategoryRepository) {}

  async execute(input: {
    name: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const name = normalizeName(input.name);
    const sortOrder = normalizeSortOrder(input.sortOrder ?? 0);
    const isActive = input.isActive ?? true;

    if (!name) {
      throw appError("CATEGORY_NAME_REQUIRED", 400);
    }

    if (name.length > 255) {
      throw appError("CATEGORY_NAME_TOO_LONG", 400);
    }

    const existing = await this.repo.findByName(name);
    if (existing) {
      throw appError("CATEGORY_NAME_ALREADY_EXISTS", 409, { name });
    }

    return this.repo.createCategory({
      name,
      sortOrder,
      isActive: Boolean(isActive),
    });
  }
}
