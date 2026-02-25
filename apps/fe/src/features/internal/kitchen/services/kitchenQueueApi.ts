import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type KitchenQueueRow = {
  orderCode: string;
  orderStatus: string;
  createdAt?: string;
  updatedAt?: string;
  branchId: string | null;
  tableCode: string | null;
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
      orderCode,
      orderStatus,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
      branchId: r.branchId == null ? null : String(r.branchId),
      tableCode: r.tableCode == null ? null : String(r.tableCode),
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