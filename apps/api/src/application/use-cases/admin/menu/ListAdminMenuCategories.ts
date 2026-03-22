import type {
  AdminMenuCategorySummary,
  IMenuCategoryRepository,
} from "../../../ports/repositories/IMenuCategoryRepository.js";

export class ListAdminMenuCategories {
  constructor(private readonly repo: IMenuCategoryRepository) {}

  execute(): Promise<AdminMenuCategorySummary[]> {
    return this.repo.listAdminCategories();
  }
}
