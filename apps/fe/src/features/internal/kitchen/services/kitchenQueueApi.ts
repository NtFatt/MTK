import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type KitchenQueueRow = {
  orderCode: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  branchId: string | null;
  tableCode: string | null;
};

export type FetchKitchenQueueParams = {
  branchId?: string | number;
  limit?: number;
  statuses?: string[]; // e.g. ["NEW","RECEIVED"]
};

function normalizeRows(raw: unknown): KitchenQueueRow[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return [];
  if (typeof raw !== "object") return [];

  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items) ? o.items : [];
  return items
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const r = x as Record<string, unknown>;
      const orderCode = typeof r.orderCode === "string" ? r.orderCode : "";
      const orderStatus = typeof r.orderStatus === "string" ? r.orderStatus : "";
      if (!orderCode) return null;

      return {
        orderCode,
        orderStatus,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
        branchId: r.branchId == null ? null : String(r.branchId),
        tableCode: r.tableCode == null ? null : String(r.tableCode),
      } satisfies KitchenQueueRow;
    })
    .filter((x): x is KitchenQueueRow => x != null);
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