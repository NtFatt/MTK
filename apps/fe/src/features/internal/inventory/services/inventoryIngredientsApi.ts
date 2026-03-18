import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

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

export type InventoryAlertRow = InventoryIngredientRow & {
  alertLevel: "WARNING" | "CRITICAL";
};

export type CreateInventoryIngredientInput = {
  branchId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  currentQty: number;
  warningThreshold: number;
  criticalThreshold: number;
  isActive?: boolean;
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
  reason?: string;
};

function normalizeIngredient(row: any): InventoryIngredientRow {
  return {
    id: String(row.id),
    branchId: String(row.branchId ?? row.branch_id ?? ""),
    ingredientCode: String(row.ingredientCode ?? row.ingredient_code ?? ""),
    ingredientName: String(row.ingredientName ?? row.ingredient_name ?? ""),
    unit: String(row.unit ?? ""),
    currentQty: Number(row.currentQty ?? row.current_qty ?? 0),
    warningThreshold: Number(row.warningThreshold ?? row.warning_threshold ?? 0),
    criticalThreshold: Number(row.criticalThreshold ?? row.critical_threshold ?? 0),
    isActive: Boolean(row.isActive ?? row.is_active),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ""),
  };
}

export async function fetchInventoryItems(branchId: string): Promise<InventoryIngredientRow[]> {
  const qs = new URLSearchParams();
  qs.set("branchId", branchId);

  const res = await apiFetchAuthed<unknown>(`/admin/inventory/items?${qs.toString()}`);
  const items =
    res && typeof res === "object" && Array.isArray((res as any).items)
      ? (res as any).items
      : [];

  return items.map(normalizeIngredient);
}

export async function createInventoryItem(
  input: CreateInventoryIngredientInput,
): Promise<InventoryIngredientRow> {
  const res = await apiFetchAuthed<unknown>(`/admin/inventory/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return normalizeIngredient(res);
}

export async function updateInventoryItem(
  input: UpdateInventoryIngredientInput,
): Promise<InventoryIngredientRow> {
  const { ingredientId, ...body } = input;

  const res = await apiFetchAuthed<unknown>(`/admin/inventory/items/${ingredientId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  return normalizeIngredient(res);
}

export async function adjustInventoryItem(input: AdjustInventoryIngredientInput): Promise<unknown> {
  const { ingredientId, ...body } = input;

  return apiFetchAuthed(`/admin/inventory/items/${ingredientId}/adjust`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchInventoryAlerts(branchId: string): Promise<InventoryAlertRow[]> {
  const qs = new URLSearchParams();
  qs.set("branchId", branchId);

  const res = await apiFetchAuthed<unknown>(`/admin/inventory/alerts?${qs.toString()}`);
  const items =
    res && typeof res === "object" && Array.isArray((res as any).items)
      ? (res as any).items
      : [];

  return items.map((row: any) => ({
    ...normalizeIngredient(row),
    alertLevel: row.alertLevel === "CRITICAL" ? "CRITICAL" : "WARNING",
  }));
}