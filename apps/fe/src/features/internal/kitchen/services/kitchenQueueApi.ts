import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type KitchenQueueRow = {
  ticketKey?: string;
  orderId?: string;
  orderCode: string;
  orderStatus: string;
  createdAt?: string;
  updatedAt?: string;
  orderNote?: string | null;
  branchId: string | null;
  tableCode: string | null;
  totalItemCount?: number;
  uniqueItemCount?: number;
  recipeConfigured?: boolean;
  items?: KitchenQueueOrderItem[];
};

export type KitchenQueueRecipeLine = {
  ingredientId: string;
  ingredientName: string;
  qtyPerItem: number;
  unit: string;
};

export type KitchenQueueOrderItem = {
  orderItemId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  itemOptions: Record<string, unknown> | null;
  kitchenStatus?: string;
  recipe: KitchenQueueRecipeLine[];
  recipeConfigured: boolean;
};

export type FetchKitchenQueueParams = {
  branchId?: string | number;
  limit?: number;
  statuses?: string[]; // ["NEW","RECEIVED"] => qs "NEW,RECEIVED"
};

function isKitchenQueueRow(x: unknown): x is KitchenQueueRow {
  if (!x || typeof x !== "object") return false;
  const r = x as any;
  return typeof r.orderCode === "string" && r.orderCode.trim().length > 0;
}

function normalizeJson(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeRows(raw: unknown): KitchenQueueRow[] {
  const items: unknown[] =
    Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as any).items)
        ? (raw as any).items
        : raw && typeof raw === "object" && Array.isArray((raw as any).data)
          ? (raw as any).data
          : [];

  const mapped: Array<KitchenQueueRow | null> = items.map((x) => {
    if (!x || typeof x !== "object") return null;
    const r = x as any;

    const orderCode = typeof r.orderCode === "string" ? r.orderCode.trim() : "";
    if (!orderCode) return null;

    const orderStatus = typeof r.orderStatus === "string" ? r.orderStatus : String(r.orderStatus ?? "");

    return {
      ticketKey:
        typeof r.ticketKey === "string"
          ? r.ticketKey
          : typeof r.ticket_key === "string"
            ? r.ticket_key
            : undefined,
      orderId:
        typeof r.orderId === "string"
          ? r.orderId
          : typeof r.order_id === "string"
            ? r.order_id
            : undefined,
      orderCode,
      orderStatus,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
      orderNote:
        typeof r.orderNote === "string"
          ? r.orderNote
          : typeof r.order_note === "string"
            ? r.order_note
            : null,
      branchId: r.branchId == null ? null : String(r.branchId),
      tableCode: r.tableCode == null ? null : String(r.tableCode),
      totalItemCount:
        typeof r.totalItemCount === "number"
          ? r.totalItemCount
          : typeof r.total_item_count === "number"
            ? r.total_item_count
            : undefined,
      uniqueItemCount:
        typeof r.uniqueItemCount === "number"
          ? r.uniqueItemCount
          : typeof r.unique_item_count === "number"
            ? r.unique_item_count
            : undefined,
      recipeConfigured:
        typeof r.recipeConfigured === "boolean"
          ? r.recipeConfigured
          : typeof r.recipe_configured === "boolean"
            ? r.recipe_configured
            : undefined,
      items: Array.isArray(r.items)
        ? r.items
            .map((item: any) => {
              const orderItemId = String(item?.orderItemId ?? item?.order_item_id ?? "").trim();
              const itemId = String(item?.itemId ?? item?.item_id ?? "").trim();
              const itemName = String(item?.itemName ?? item?.item_name ?? "").trim();
              if (!orderItemId || !itemId || !itemName) return null;

              return {
                orderItemId,
                itemId,
                itemName,
                quantity: Number(item?.quantity ?? 0),
                itemOptions: normalizeJson(item?.itemOptions ?? item?.item_options ?? null),
                kitchenStatus:
                  typeof item?.kitchenStatus === "string"
                    ? item.kitchenStatus
                    : typeof item?.kitchen_status === "string"
                      ? item.kitchen_status
                      : undefined,
                recipeConfigured: Boolean(item?.recipeConfigured ?? item?.recipe_configured ?? false),
                recipe: Array.isArray(item?.recipe)
                  ? item.recipe
                      .map((line: any) => {
                        const ingredientId = String(line?.ingredientId ?? line?.ingredient_id ?? "").trim();
                        const ingredientName = String(line?.ingredientName ?? line?.ingredient_name ?? "").trim();
                        if (!ingredientId || !ingredientName) return null;

                        return {
                          ingredientId,
                          ingredientName,
                          qtyPerItem: Number(line?.qtyPerItem ?? line?.qty_per_item ?? 0),
                          unit: String(line?.unit ?? ""),
                        };
                      })
                      .filter((line: KitchenQueueRecipeLine | null): line is KitchenQueueRecipeLine => line != null)
                  : [],
              } satisfies KitchenQueueOrderItem;
            })
            .filter((item: KitchenQueueOrderItem | null): item is KitchenQueueOrderItem => item != null)
        : undefined,
    };
  });

  // ✅ filter null + type-safe
  return mapped.filter((x): x is KitchenQueueRow => x != null && isKitchenQueueRow(x));
}

export async function fetchKitchenQueue(params: FetchKitchenQueueParams = {}): Promise<KitchenQueueRow[]> {
  const search = new URLSearchParams();
  if (params.branchId != null) search.set("branchId", String(params.branchId));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.statuses?.length) search.set("statuses", params.statuses.join(","));

  const qs = search.toString();
  const path = `/admin/kitchen/queue${qs ? `?${qs}` : ""}`;

  const res = await apiFetchAuthed<unknown>(path);
  return normalizeRows(res);
}
