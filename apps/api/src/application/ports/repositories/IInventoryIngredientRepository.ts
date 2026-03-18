export type InventoryIngredientRow = {
  id: string;
  branchId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  currentQty: number;
  warningThreshold: number;
  criticalThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateInventoryIngredientInput = {
  branchId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  currentQty: number;
  warningThreshold: number;
  criticalThreshold: number;
  isActive: boolean;
};

export type UpdateInventoryIngredientInput = {
  ingredientId: string;
  branchId: string;
  ingredientName?: string;
  unit?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  isActive?: boolean;
};

export type AdjustInventoryIngredientInput = {
  ingredientId: string;
  branchId: string;
  adjustmentType: "IN" | "OUT" | "SET" | "CORRECTION";
  quantity: number;
  reason: string | null;
  actorType: string | null;
  actorId: string | null;
};

export type InventoryAlertRow = InventoryIngredientRow & {
  alertLevel: "WARNING" | "CRITICAL";
};

export interface IInventoryIngredientRepository {
  listByBranch(branchId: string): Promise<InventoryIngredientRow[]>;
  create(input: CreateInventoryIngredientInput): Promise<InventoryIngredientRow>;
  update(input: UpdateInventoryIngredientInput): Promise<InventoryIngredientRow>;
  adjust(input: AdjustInventoryIngredientInput): Promise<{
    ingredientId: string;
    branchId: string;
    prevQty: number;
    newQty: number;
    adjustmentType: "IN" | "OUT" | "SET" | "CORRECTION";
  }>;
  listAlerts(branchId: string): Promise<InventoryAlertRow[]>;
}