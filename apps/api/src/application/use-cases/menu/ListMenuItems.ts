import type {
  IMenuCatalogRepository,
  MenuItemListQuery,
} from "../../ports/repositories/IMenuCatalogRepository.js";

export class ListMenuItems {
  constructor(private repo: IMenuCatalogRepository) {}

  execute(query: MenuItemListQuery) {
    return this.repo.listItems(query);
  }
}
