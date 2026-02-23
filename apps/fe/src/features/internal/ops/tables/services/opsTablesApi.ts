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
  return {
    id: typeof o.id === "string" || typeof o.id === "number" ? o.id : undefined,
    code: typeof o.code === "string" ? o.code : typeof o.tableCode === "string" ? (o.tableCode as string) : undefined,
    status: typeof o.status === "string" ? o.status : typeof o.tableStatus === "string" ? (o.tableStatus as string) : undefined,
    seats: typeof o.seats === "number" ? o.seats : undefined,
    area: typeof o.area === "string" ? (o.area as string) : o.area === null ? null : undefined,
    sessionKey: typeof o.sessionKey === "string" ? (o.sessionKey as string) : o.sessionKey === null ? null : undefined,
    cartKey: typeof o.cartKey === "string" ? (o.cartKey as string) : o.cartKey === null ? null : undefined,
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
