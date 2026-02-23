import type { IMenuCatalogRepository } from "../../ports/repositories/IMenuCatalogRepository.js";

export class GetMeatProfile {
  constructor(private repo: IMenuCatalogRepository) {}

  execute(itemId: string) {
    return this.repo.getMeatProfile(itemId);
  }
}
