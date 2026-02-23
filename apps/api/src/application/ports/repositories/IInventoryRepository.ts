export type BranchStockRow = {
  branchId: string;
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string | null;
  quantity: number;
  lastRestockAt: string | null;
  updatedAt: string;
};

export type AdjustStockMode = "RESTOCK" | "DEDUCT" | "SET";

export type AdjustBranchStockInput = {
  branchId: string;
  itemId: string;
  mode: AdjustStockMode;
  quantity: number;
};

export type AdjustBranchStockOutput = {
  branchId: string;
  itemId: string;
  prevQty: number;
  newQty: number;
  mode: AdjustStockMode;
};

export interface IInventoryRepository {
  listBranchStock(branchId: string): Promise<BranchStockRow[]>;
  adjustBranchStock(input: AdjustBranchStockInput): Promise<AdjustBranchStockOutput>;
}
