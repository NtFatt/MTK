import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

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

function normalizeRecipeLine(row: any): MenuRecipeLine {
  return {
    ingredientId: String(row.ingredientId ?? row.ingredient_id ?? ""),
    ingredientName: String(row.ingredientName ?? row.ingredient_name ?? ""),
    qtyPerItem: Number(row.qtyPerItem ?? row.qty_per_item ?? 0),
    unit: String(row.unit ?? ""),
  };
}

export async function fetchMenuRecipe(
  branchId: string,
  menuItemId: string,
): Promise<MenuRecipeLine[]> {
  const qs = new URLSearchParams();
  qs.set("branchId", branchId);

  const res = await apiFetchAuthed<unknown>(
    `/admin/menu/items/${menuItemId}/recipe?${qs.toString()}`,
  );

  const items =
    res && typeof res === "object" && Array.isArray((res as any).items)
      ? (res as any).items
      : [];

  return items.map(normalizeRecipeLine);
}

export async function saveMenuRecipe(input: {
  branchId: string;
  menuItemId: string;
  lines: SaveMenuRecipeLineInput[];
}): Promise<MenuRecipeLine[]> {
  const res = await apiFetchAuthed<unknown>(
    `/admin/menu/items/${input.menuItemId}/recipe`,
    {
      method: "PUT",
      body: JSON.stringify({
        branchId: input.branchId,
        lines: input.lines,
      }),
    },
  );

  const items =
    res && typeof res === "object" && Array.isArray((res as any).items)
      ? (res as any).items
      : [];

  return items.map(normalizeRecipeLine);
}