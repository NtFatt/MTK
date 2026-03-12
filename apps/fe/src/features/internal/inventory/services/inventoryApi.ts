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

  const available = Number(x.quantity ?? x.available ?? x.qty ?? x.stock ?? 0);
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
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeStockRow)
      .filter((v: InventoryStockRow | null): v is InventoryStockRow => v !== null);
  }

  if (raw && typeof raw === "object") {
    const o: any = raw;
    const items = Array.isArray(o.items) ? o.items : Array.isArray(o.data) ? o.data : null;
    if (items) {
      return items
        .map(normalizeStockRow)
        .filter((v: InventoryStockRow | null): v is InventoryStockRow => v !== null);
    }
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
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeHoldRow)
      .filter((v: InventoryHoldRow | null): v is InventoryHoldRow => v !== null);
  }

  if (raw && typeof raw === "object") {
    const o: any = raw;
    const items = Array.isArray(o.items) ? o.items : Array.isArray(o.data) ? o.data : null;
    if (items) {
      return items
        .map(normalizeHoldRow)
        .filter((v: InventoryHoldRow | null): v is InventoryHoldRow => v !== null);
    }
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

export type InventoryAdjustmentRow = {
  auditId: string;
  branchId: string;
  itemId: string;
  itemName?: string;
  mode?: string;
  reason?: string;
  actorId?: string;
  actorName?: string;
  actorUsername?: string;
  prevQty: number;
  newQty: number;
  delta: number;
  createdAt?: string;
};

export type InventoryAdjustmentsPage = {
  items: InventoryAdjustmentRow[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

function normalizeAdjustmentRow(x: any): InventoryAdjustmentRow | null {
  if (!x || typeof x !== "object") return null;

  const auditId = String(x.auditId ?? x.audit_id ?? x.id ?? "");
  const branchId = String(x.branchId ?? x.branch_id ?? "");
  const itemId = String(x.itemId ?? x.item_id ?? x.menuItemId ?? x.menu_item_id ?? "");

  if (!auditId || !branchId || !itemId) return null;

  const prevQty = Number(x.prevQty ?? x.prev_qty ?? x.beforeQty ?? x.before_qty ?? 0);
  const newQty = Number(x.newQty ?? x.new_qty ?? x.afterQty ?? x.after_qty ?? 0);
  const rawDelta = x.delta ?? x.changeQty ?? x.change_qty;
  const delta = Number(rawDelta ?? (newQty - prevQty));

  return {
    auditId,
    branchId,
    itemId,
    itemName: x.itemName ?? x.item_name ?? x.name ?? undefined,
    mode: x.mode ?? x.action ?? undefined,
    reason: x.reason ?? undefined,
    actorId: x.actorId != null ? String(x.actorId) : x.actor_id != null ? String(x.actor_id) : undefined,
    actorName: x.actorName ?? x.actor_name ?? undefined,
    actorUsername: x.actorUsername ?? x.actor_username ?? x.username ?? undefined,
    prevQty: Number.isFinite(prevQty) ? Math.trunc(prevQty) : 0,
    newQty: Number.isFinite(newQty) ? Math.trunc(newQty) : 0,
    delta: Number.isFinite(delta) ? Math.trunc(delta) : 0,
    createdAt: x.createdAt ?? x.created_at ?? undefined,
  };
}

function normalizeAdjustmentsPage(raw: unknown, fallbackLimit = 20): InventoryAdjustmentsPage {
  if (raw && typeof raw === "object") {
    const o: any = raw;
    const itemsRaw = Array.isArray(o.items) ? o.items : Array.isArray(o.data) ? o.data : [];
    const items = itemsRaw
      .map(normalizeAdjustmentRow)
      .filter(
        (v: InventoryAdjustmentRow | null): v is InventoryAdjustmentRow => v !== null
      );

    return {
      items,
      page: {
        limit: Number.isFinite(Number(o?.page?.limit))
          ? Math.trunc(Number(o.page.limit))
          : fallbackLimit,
        nextCursor:
          o?.page?.nextCursor != null && String(o.page.nextCursor).trim() !== ""
            ? String(o.page.nextCursor)
            : null,
        hasMore: Boolean(o?.page?.hasMore),
      },
    };
  }

  return {
    items: [],
    page: {
      limit: fallbackLimit,
      nextCursor: null,
      hasMore: false,
    },
  };
}

export async function fetchInventoryAdjustments(input: {
  branchId: string | number;
  itemId?: string | number;
  actorId?: string | number;
  mode?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | number;
}): Promise<InventoryAdjustmentsPage> {
  const qs = new URLSearchParams();
  qs.set("branchId", String(input.branchId));

  if (input.itemId != null && String(input.itemId).trim() !== "") {
    qs.set("itemId", String(input.itemId));
  }
  if (input.actorId != null && String(input.actorId).trim() !== "") {
    qs.set("actorId", String(input.actorId));
  }
  if (input.mode && input.mode.trim() !== "") {
    qs.set("mode", input.mode);
  }
  if (input.from && input.from.trim() !== "") {
    qs.set("from", input.from);
  }
  if (input.to && input.to.trim() !== "") {
    qs.set("to", input.to);
  }
  if (input.limit != null) {
    qs.set("limit", String(input.limit));
  }
  if (input.cursor != null && String(input.cursor).trim() !== "") {
    qs.set("cursor", String(input.cursor));
  }

  const res = await apiFetchAuthed<unknown>(`/admin/inventory/adjustments?${qs.toString()}`);
  return normalizeAdjustmentsPage(res, input.limit ?? 20);
}