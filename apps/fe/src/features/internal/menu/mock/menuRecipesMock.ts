export type InternalMenuItem = {
  id: string;
  name: string;
  category: string;
};

export type RecipeLine = {
  ingredientName: string;
  qty: number;
  unit: string;
};

export const INTERNAL_MENU_ITEMS_MOCK: InternalMenuItem[] = [
  { id: "101", name: "Bò Mỹ Nhúng Lẩu", category: "Thịt bò" },
  { id: "102", name: "Mì Udon", category: "Tinh bột" },
  { id: "103", name: "Nấm Kim Châm", category: "Rau nấm" },
  { id: "104", name: "Nước Lẩu Cay", category: "Nước dùng" },
];

export const MENU_RECIPE_MOCK: Record<string, RecipeLine[]> = {
  "101": [
    { ingredientName: "Bò Mỹ", qty: 0.2, unit: "kg" },
    { ingredientName: "Sốt sa tế", qty: 0.02, unit: "lít" },
  ],
  "102": [{ ingredientName: "Mì", qty: 1, unit: "gói" }],
  "103": [{ ingredientName: "Nấm kim châm", qty: 1, unit: "gói" }],
  "104": [{ ingredientName: "Nước lẩu", qty: 0.5, unit: "lít" }],
};