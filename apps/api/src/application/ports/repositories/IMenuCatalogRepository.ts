import type { MenuCategory } from "../../../domain/entities/MenuCategory.js";
import type { MenuItem } from "../../../domain/entities/MenuItem.js";
import type { MeatProfile } from "../../../domain/entities/MeatProfile.js";
import type { ComboDetail } from "../../../domain/entities/ComboDetail.js";

export type MenuItemSort = "name" | "price_asc" | "price_desc" | "newest";

export type MenuItemListQuery = {
  categoryId?: string | null;
  q?: string | null;
  isActive?: boolean | null;
  /** Optional: return stock quantity for a specific branch (SoT: menu_item_stock). */
  branchId?: string | null;
  /** Optional: filter to items that are currently in stock (uses branchId when provided). */
  onlyInStock?: boolean | null;
  sort?: MenuItemSort | null;
  limit?: number | null;
  offset?: number | null;
};

export interface IMenuCatalogRepository {
  listCategories(activeOnly?: boolean): Promise<MenuCategory[]>;
  listItems(query: MenuItemListQuery): Promise<{ items: MenuItem[]; total: number }>;
  getItemById(itemId: string): Promise<MenuItem | null>;
  getMeatProfile(itemId: string): Promise<MeatProfile | null>;
  getComboDetailByItemId(itemId: string): Promise<ComboDetail | null>;
}
