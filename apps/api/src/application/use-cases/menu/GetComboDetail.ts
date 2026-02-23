import type { IMenuCatalogRepository } from "../../ports/repositories/IMenuCatalogRepository.js";

export class GetComboDetail {
  constructor(private repo: IMenuCatalogRepository) {}

  execute(comboItemId: string) {
    return this.repo.getComboDetailByItemId(comboItemId);
  }
}
