export type MenuRecipeLine = {
  ingredientId: string;
  ingredientName: string;
  qtyPerItem: number;
  unit: string;
};

export type SaveMenuRecipeLineInput = {
  ingredientId: string;
  qtyPerItem: number;
  unit: string;
};

export interface IMenuRecipeRepository {
  getByMenuItemId(menuItemId: string, branchId: string): Promise<MenuRecipeLine[]>;
  saveByMenuItemId(input: {
    menuItemId: string;
    branchId: string;
    lines: SaveMenuRecipeLineInput[];
  }): Promise<MenuRecipeLine[]>;
}