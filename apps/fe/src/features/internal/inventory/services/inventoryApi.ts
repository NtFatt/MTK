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

const available = Number(x.quantity ?? x.available ?? x.qty ?? x.stock ?? 0);  const onHold = Number(x.onHold ?? x.on_hold ?? x.hold ?? 0);

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

export type InventoryHoldRow = {
  holdKey: string;
  cartKey: string;
  branchId: string;
  itemId: string;
  optionsHash: string;
  noteHash: string;
  qty: number;
  expireAtMs: number;
};

function normalizeHoldRow(x: any): InventoryHoldRow | null {
  if (!x || typeof x !== "object") return null;

  const holdKey = String(x.holdKey ?? x.hold_key ?? "");
  const cartKey = String(x.cartKey ?? x.cart_key ?? "");
  const branchId = String(x.branchId ?? x.branch_id ?? "");
  const itemId = String(x.itemId ?? x.item_id ?? "");
  if (!holdKey || !cartKey || !branchId || !itemId) return null;

  const qty = Number(x.qty ?? x.quantity ?? 0);
  const expireAtMs = Number(x.expireAtMs ?? x.expire_at_ms ?? x.expireAt ?? 0);

  return {
    holdKey,
    cartKey,
    branchId,
    itemId,
    optionsHash: String(x.optionsHash ?? x.options_hash ?? ""),
    noteHash: String(x.noteHash ?? x.note_hash ?? ""),
    qty: Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0,
    expireAtMs: Number.isFinite(expireAtMs) ? Math.max(0, Math.floor(expireAtMs)) : 0,
  };
}

function normalizeHoldList(raw: unknown): InventoryHoldRow[] {
  if (Array.isArray(raw)) return raw.map(normalizeHoldRow).filter((v): v is InventoryHoldRow => !!v);
  if (raw && typeof raw === "object") {
    const o: any = raw as any;
    const items = Array.isArray(o.items) ? o.items : Array.isArray(o.data) ? o.data : null;
    if (items) return items.map(normalizeHoldRow).filter((v: any) => !!v);
  }
  return [];
}

export async function fetchInventoryHolds(input: {
  branchId: string | number;
  limit?: number;
}): Promise<InventoryHoldRow[]> {
  const qs = new URLSearchParams();
  qs.set("branchId", String(input.branchId));
  if (input.limit != null) qs.set("limit", String(input.limit));

  const res = await apiFetchAuthed<unknown>(`/admin/inventory/holds?${qs.toString()}`);
  return normalizeHoldList(res);
}