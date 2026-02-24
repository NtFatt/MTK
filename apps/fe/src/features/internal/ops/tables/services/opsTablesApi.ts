import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

export type OpsTableDto = {
  id?: string | number;
  code?: string;
  status?: string;
  seats?: number;
  area?: string | null;
  sessionKey?: string | null;
  cartKey?: string | null;
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
    typeof o.code === "string" ? o.code :
    typeof o.tableCode === "string" ? o.tableCode :
    table && typeof table.code === "string" ? table.code :
    table && typeof table.tableCode === "string" ? table.tableCode :
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

  return { id, code, status, seats, area, sessionKey, cartKey };
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
