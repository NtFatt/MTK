export type InventoryIngredientRow = {
  id: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  warning: number;
  critical: number;
  active: boolean;
};

export const INVENTORY_INGREDIENT_MOCK_ROWS: InventoryIngredientRow[] = [
  { id: "1", code: "ING_BEEF_US", name: "Bò Mỹ", unit: "kg", qty: 20, warning: 5, critical: 2, active: true },
  { id: "2", code: "ING_MUSHROOM_ENOKI", name: "Nấm kim châm", unit: "gói", qty: 8, warning: 10, critical: 5, active: true },
  { id: "3", code: "ING_NOODLE", name: "Mì", unit: "gói", qty: 36, warning: 12, critical: 6, active: true },
  { id: "4", code: "ING_BROTH", name: "Nước lẩu", unit: "lít", qty: 11, warning: 20, critical: 10, active: true },
  { id: "5", code: "ING_SATE", name: "Sốt sa tế", unit: "lít", qty: 3, warning: 5, critical: 2, active: false },
];

export function inventoryStockTone(row: InventoryIngredientRow) {
  if (row.qty <= row.critical) {
    return {
      level: "critical" as const,
      label: "Critical",
      className: "border-destructive/40 bg-destructive/10 text-destructive",
    };
  }

  if (row.qty <= row.warning) {
    return {
      level: "warning" as const,
      label: "Warning",
      className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
    };
  }

  return {
    level: "normal" as const,
    label: "Ổn định",
    className: undefined,
  };
}

export function inventoryAlertRows(rows: InventoryIngredientRow[]) {
  return rows.filter((row) => row.qty <= row.warning);
}