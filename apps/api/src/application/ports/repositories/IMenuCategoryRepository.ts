import type { MenuCategory } from "../../../domain/entities/MenuCategory.js";

export type AdminMenuCategorySummary = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
  activeItemCount: number;
};

export interface IMenuCategoryRepository {
  listAdminCategories(): Promise<AdminMenuCategorySummary[]>;
  findById(categoryId: string): Promise<MenuCategory | null>;
  findByName(name: string, excludeCategoryId?: string | null): Promise<MenuCategory | null>;
  countItems(categoryId: string): Promise<number>;
  createCategory(input: {
    name: string;
    sortOrder: number;
    isActive: boolean;
  }): Promise<MenuCategory>;
  updateCategory(input: {
    categoryId: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<MenuCategory | null>;
  deleteCategory(categoryId: string): Promise<boolean>;
}
