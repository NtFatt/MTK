import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type InventoryStockRow = {
  itemId?: string | number;
  itemName?: string;
  branchId?: string | number;
  available?: number;
  onHold?: number;
  updatedAt?: string;
};

export type AdjustStockInput = {
  branchId: string | number;
  itemId: string | number;
  mode: "RESTOCK" | "DEDUCT" | "SET";
  quantity: number;
};

function normalizeStockRow(x: any): InventoryStockRow | null {
  if (!x || typeof x !== "object") return null;
  const itemId = x.itemId ?? x.item_id ?? x.id ?? x.menuItemId ?? x.menu_item_id;
  if (itemId == null) return null;

  const available = Number(x.available ?? x.qty ?? x.stock ?? 0);
  const onHold = Number(x.onHold ?? x.on_hold ?? x.hold ?? 0);

  return {
    itemId,
    itemName: x.itemName ?? x.item_name ?? x.name ?? undefined,
    branchId: x.branchId ?? x.branch_id ?? undefined,
    available: Number.isFinite(available) ? Math.trunc(available) : 0,
    onHold: Number.isFinite(onHold) ? Math.trunc(onHold) : 0,
    updatedAt: x.updatedAt ?? x.updated_at ?? undefined,
  };
}

function normalizeList(raw: unknown): InventoryStockRow[] {
  if (Array.isArray(raw)) return raw.map(normalizeStockRow).filter((v): v is InventoryStockRow => !!v);
  if (raw && typeof raw === "object") {
    const o: any = raw as any;
    const items = Array.isArray(o.items) ? o.items : Array.isArray(o.data) ? o.data : null;
    if (items) return items.map(normalizeStockRow).filter((v: any) => !!v);
  }
  return [];
}

export async function fetchInventoryStock(branchId: string | number): Promise<InventoryStockRow[]> {
  const qs = new URLSearchParams();
  qs.set("branchId", String(branchId));
  const res = await apiFetchAuthed<unknown>(`/admin/inventory/stock?${qs.toString()}`);
  return normalizeList(res);
}

export async function adjustInventoryStock(input: AdjustStockInput): Promise<unknown> {
  return apiFetchAuthed(`/admin/inventory/stock/adjust`, {
    method: "POST",
    body: JSON.stringify({
      branchId: input.branchId,
      itemId: input.itemId,
      mode: input.mode,
      quantity: input.quantity,
    }),
  });
}