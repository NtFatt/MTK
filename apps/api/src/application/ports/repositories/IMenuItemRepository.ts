import type { MenuItem } from "../../../domain/entities/MenuItem.js";

export interface IMenuItemRepository {
  getUnitPrice(itemId: string): Promise<number | null>;

  existsCategory(categoryId: string): Promise<boolean>;

  createMenuItem(input: {
    categoryId: string;
    name: string;
    price: number;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
  }): Promise<MenuItem>;
}