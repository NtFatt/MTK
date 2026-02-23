import type { IMenuCatalogRepository } from "../../ports/repositories/IMenuCatalogRepository.js";

export class GetMenuItemDetail {
  constructor(private repo: IMenuCatalogRepository) {}

  execute(itemId: string) {
    return this.repo.getItemById(itemId);
  }
}
