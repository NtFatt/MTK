import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

export type OpsTableDto = {
  id?: string | number;
  code?: string;
  status?: string;
  seats?: number;
  area?: string | null;
  sessionKey?: string | null;
  cartKey?: string | null;
  activeOrdersCount?: number;
  activeOrderCode?: string | null;
  activeOrderStatus?: string | null;
  activeOrderUpdatedAt?: string | null;
  activeItemsCount?: number | null;
  activeItemsPreview?: string | null;
  activeItemsTop?: Array<{ name: string; qty: number }> | null;
};


export type FetchOpsTablesParams = {
  branchId?: string | number;
};

function normalizeOne(x: unknown): OpsTableDto | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const table = (o.table && typeof o.table === "object") ? (o.table as Record<string, unknown>) : null;

  const id =
    (typeof o.id === "string" || typeof o.id === "number") ? o.id :
      (typeof o.tableId === "string" || typeof o.tableId === "number") ? o.tableId :
        (table && (typeof table.id === "string" || typeof table.id === "number")) ? table.id :
          (table && (typeof table.tableId === "string" || typeof table.tableId === "number")) ? table.tableId :
            undefined;

  const code =
    // Ưu tiên tableCode / table_code (đúng nghĩa “mã bàn”)
    typeof o.tableCode === "string" ? o.tableCode :
      typeof (o as any).table_code === "string" ? (o as any).table_code :
        table && typeof table.tableCode === "string" ? table.tableCode :
          table && typeof (table as any).table_code === "string" ? (table as any).table_code :
            // Fallback cuối cùng mới dùng code (đề phòng BE chỉ trả code)
            table && typeof table.code === "string" ? table.code :
              typeof o.code === "string" ? o.code :
                undefined;

  const status =
    typeof o.status === "string" ? o.status :
      typeof o.tableStatus === "string" ? o.tableStatus :
        table && typeof table.status === "string" ? table.status :
          table && typeof table.tableStatus === "string" ? table.tableStatus :
            undefined;

  const seats =
    typeof o.seats === "number" ? o.seats :
      table && typeof table.seats === "number" ? table.seats :
        undefined;

  const area =
    typeof o.area === "string" ? o.area :
      typeof o.areaName === "string" ? o.areaName :
        table && typeof table.area === "string" ? table.area :
          table && typeof table.areaName === "string" ? table.areaName :
            o.area === null ? null :
              undefined;

  const sessionKey =
    typeof o.sessionKey === "string" ? o.sessionKey :
      typeof (o as any).session_key === "string" ? (o as any).session_key :
        table && typeof table.sessionKey === "string" ? table.sessionKey :
          table && typeof (table as any).session_key === "string" ? (table as any).session_key :
            o.sessionKey === null ? null :
              undefined;

  const cartKey =
    typeof o.cartKey === "string" ? o.cartKey :
      typeof (o as any).cart_key === "string" ? (o as any).cart_key :
        table && typeof table.cartKey === "string" ? table.cartKey :
          table && typeof (table as any).cart_key === "string" ? (table as any).cart_key :
            o.cartKey === null ? null :
              undefined;

  const activeOrdersCount =
    typeof (o as any).activeOrdersCount === "number" ? (o as any).activeOrdersCount :
      table && typeof (table as any).activeOrdersCount === "number" ? (table as any).activeOrdersCount :
        0;

  const activeOrderCode =
    typeof (o as any).activeOrderCode === "string" ? (o as any).activeOrderCode :
      table && typeof (table as any).activeOrderCode === "string" ? (table as any).activeOrderCode :
        (o as any).activeOrderCode === null ? null :
          table && (table as any).activeOrderCode === null ? null :
            undefined;

  const activeOrderStatus =
    typeof (o as any).activeOrderStatus === "string" ? (o as any).activeOrderStatus :
      table && typeof (table as any).activeOrderStatus === "string" ? (table as any).activeOrderStatus :
        (o as any).activeOrderStatus === null ? null :
          table && (table as any).activeOrderStatus === null ? null :
            undefined;

  const activeOrderUpdatedAt =
    typeof (o as any).activeOrderUpdatedAt === "string" ? (o as any).activeOrderUpdatedAt :
      table && typeof (table as any).activeOrderUpdatedAt === "string" ? (table as any).activeOrderUpdatedAt :
        (o as any).activeOrderUpdatedAt === null ? null :
          table && (table as any).activeOrderUpdatedAt === null ? null :
            undefined;

  const activeItemsCount =
    typeof (o as any).activeItemsCount === "number" ? (o as any).activeItemsCount :
      table && typeof (table as any).activeItemsCount === "number" ? (table as any).activeItemsCount :
        (o as any).activeItemsCount === null ? null :
          table && (table as any).activeItemsCount === null ? null :
            undefined;

  const activeItemsPreview =
    typeof (o as any).activeItemsPreview === "string" ? (o as any).activeItemsPreview :
      table && typeof (table as any).activeItemsPreview === "string" ? (table as any).activeItemsPreview :
        (o as any).activeItemsPreview === null ? null :
          table && (table as any).activeItemsPreview === null ? null :
            undefined;

  const activeItemsTopRaw =
    Array.isArray((o as any).activeItemsTop) ? (o as any).activeItemsTop :
      (table && Array.isArray((table as any).activeItemsTop) ? (table as any).activeItemsTop : null);

  const activeItemsTop =
    activeItemsTopRaw
      ? activeItemsTopRaw
        .map((it: any) => {
          const name = typeof it?.name === "string" ? it.name : null;
          const qty = typeof it?.qty === "number" ? it.qty : null;
          return name && qty != null ? { name, qty } : null;
        })
        .filter(Boolean)
      : ((o as any).activeItemsTop === null || (table as any)?.activeItemsTop === null ? null : undefined);
  return {
    id, code, status, seats, area, sessionKey, cartKey,
    activeOrdersCount,
    activeOrderCode,
    activeOrderStatus,
    activeOrderUpdatedAt,
    activeItemsCount,
    activeItemsPreview,
    activeItemsTop,
  };
}

function normalizeList(raw: unknown): OpsTableDto[] {
  if (Array.isArray(raw)) return raw.map(normalizeOne).filter((x): x is OpsTableDto => x != null);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const items = (Array.isArray(o.items) && o.items) || (Array.isArray(o.data) && o.data) || null;
    if (items) return items.map(normalizeOne).filter((x): x is OpsTableDto => x != null);
  }
  return [];
}

export async function fetchOpsTables(params: FetchOpsTablesParams = {}): Promise<OpsTableDto[]> {
  const search = new URLSearchParams();
  if (params.branchId != null) search.set("branchId", String(params.branchId));
  const qs = search.toString();
  const path = `/admin/ops/tables${qs ? `?${qs}` : ""}`;
  const res = await apiFetchAuthed<unknown>(path);
  return normalizeList(res);
}
