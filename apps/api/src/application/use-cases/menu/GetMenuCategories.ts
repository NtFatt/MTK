import type { IMenuCatalogRepository } from "../../ports/repositories/IMenuCatalogRepository.js";

export class GetMenuCategories {
  constructor(private repo: IMenuCatalogRepository) {}

  execute(activeOnly: boolean = true) {
    return this.repo.listCategories(activeOnly);
  }
}
