import {
  Schemas,
  type OpsTableRow,
  type OpsTableTopItem,
} from "@hadilao/contracts";
import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

export type OpsTableDto = {
  id: string;
  branchId?: string;
  code: string;
  status: OpsTableRow["tableStatus"];
  seats: number;
  area?: string | null;
  directionId?: string | null;
  sessionKey?: string | null;
  cartKey?: string | null;
  activeOrdersCount: number;
  activeOrderCode?: string | null;
  activeOrderStatus?: string | null;
  activeOrderUpdatedAt?: string | null;
  activeItemsCount?: number | null;
  activeItemsPreview?: string | null;
  activeItemsTop?: OpsTableTopItem[] | null;
  unpaidOrdersCount: number;
  unpaidOrderCode?: string | null;
  unpaidOrderStatus?: string | null;
  unpaidOrderUpdatedAt?: string | null;
  unpaidItemsCount?: number | null;
  unpaidItemsPreview?: string | null;
  unpaidItemsTop?: OpsTableTopItem[] | null;
};

export type FetchOpsTablesParams = {
  branchId?: string | number;
};

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | null {
  return value != null && typeof value === "object" ? (value as RawRecord) : null;
}

function pickFirst<T>(...values: Array<T | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function asStringId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asStringOrNull(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNonNegativeInt(value: unknown): number | undefined {
  const num = typeof value === "string" ? Number(value) : value;
  return typeof num === "number" && Number.isInteger(num) && num >= 0 ? num : undefined;
}

function normalizeTopItems(value: unknown): OpsTableTopItem[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;

  return value
    .map((entry) => {
      const record = asRecord(entry);
      const name = record ? asStringId(record.name) : undefined;
      const qty = record ? asNonNegativeInt(record.qty) : undefined;
      return name && qty !== undefined ? { name, qty } : null;
    })
    .filter((entry): entry is OpsTableTopItem => entry != null);
}

function toContractRowCandidate(input: unknown): unknown {
  const record = asRecord(input);
  if (!record) return null;

  const nestedTable = asRecord(record.table);

  return {
    tableId: pickFirst(
      asStringId(record.tableId),
      asStringId(record.id),
      asStringId(nestedTable?.tableId),
      asStringId(nestedTable?.id),
    ),
    branchId: pickFirst(
      asStringId(record.branchId),
      asStringId(record.branch_id),
      asStringId(nestedTable?.branchId),
      asStringId(nestedTable?.branch_id),
    ),
    code: pickFirst(
      asStringId(record.code),
      asStringId(record.tableCode),
      asStringId(record.table_code),
      asStringId(nestedTable?.code),
      asStringId(nestedTable?.tableCode),
      asStringId(nestedTable?.table_code),
    ),
    areaName: pickFirst(
      asStringOrNull(record.areaName),
      asStringOrNull(record.area),
      asStringOrNull(record.area_name),
      asStringOrNull(nestedTable?.areaName),
      asStringOrNull(nestedTable?.area),
      asStringOrNull(nestedTable?.area_name),
    ),
    seats: pickFirst(
      asNonNegativeInt(record.seats),
      asNonNegativeInt(nestedTable?.seats),
    ),
    tableStatus: pickFirst(
      asStringId(record.tableStatus),
      asStringId(record.status),
      asStringId(nestedTable?.tableStatus),
      asStringId(nestedTable?.status),
    ),
    directionId: pickFirst(
      asStringOrNull(record.directionId),
      asStringOrNull(record.direction_id),
      asStringOrNull(nestedTable?.directionId),
      asStringOrNull(nestedTable?.direction_id),
    ),
    sessionKey: pickFirst(
      asStringOrNull(record.sessionKey),
      asStringOrNull(record.session_key),
      asStringOrNull(record.activeSessionKey),
      asStringOrNull(record.active_session_key),
      asStringOrNull(record.currentSessionKey),
      asStringOrNull(nestedTable?.sessionKey),
      asStringOrNull(nestedTable?.session_key),
    ),
    cartKey: pickFirst(
      asStringOrNull(record.cartKey),
      asStringOrNull(record.cart_key),
      asStringOrNull(record.activeCartKey),
      asStringOrNull(record.active_cart_key),
      asStringOrNull(nestedTable?.cartKey),
      asStringOrNull(nestedTable?.cart_key),
    ),
    activeOrdersCount: pickFirst(
      asNonNegativeInt(record.activeOrdersCount),
      asNonNegativeInt(nestedTable?.activeOrdersCount),
      0,
    ),
    activeOrderCode: pickFirst(
      asStringOrNull(record.activeOrderCode),
      asStringOrNull(nestedTable?.activeOrderCode),
    ),
    activeOrderStatus: pickFirst(
      asStringOrNull(record.activeOrderStatus),
      asStringOrNull(nestedTable?.activeOrderStatus),
    ),
    activeOrderUpdatedAt: pickFirst(
      asStringOrNull(record.activeOrderUpdatedAt),
      asStringOrNull(nestedTable?.activeOrderUpdatedAt),
    ),
    activeItemsCount: pickFirst(
      asNonNegativeInt(record.activeItemsCount),
      asNonNegativeInt(nestedTable?.activeItemsCount),
      record.activeItemsCount === null || nestedTable?.activeItemsCount === null ? null : undefined,
    ),
    activeItemsPreview: pickFirst(
      asStringOrNull(record.activeItemsPreview),
      asStringOrNull(nestedTable?.activeItemsPreview),
    ),
    activeItemsTop: pickFirst(
      normalizeTopItems(record.activeItemsTop),
      normalizeTopItems(nestedTable?.activeItemsTop),
      record.activeItemsTop === null || nestedTable?.activeItemsTop === null ? null : undefined,
    ),
    unpaidOrdersCount: pickFirst(
      asNonNegativeInt(record.unpaidOrdersCount),
      asNonNegativeInt(nestedTable?.unpaidOrdersCount),
      0,
    ),
    unpaidOrderCode: pickFirst(
      asStringOrNull(record.unpaidOrderCode),
      asStringOrNull(nestedTable?.unpaidOrderCode),
    ),
    unpaidOrderStatus: pickFirst(
      asStringOrNull(record.unpaidOrderStatus),
      asStringOrNull(nestedTable?.unpaidOrderStatus),
    ),
    unpaidOrderUpdatedAt: pickFirst(
      asStringOrNull(record.unpaidOrderUpdatedAt),
      asStringOrNull(nestedTable?.unpaidOrderUpdatedAt),
    ),
    unpaidItemsCount: pickFirst(
      asNonNegativeInt(record.unpaidItemsCount),
      asNonNegativeInt(nestedTable?.unpaidItemsCount),
      record.unpaidItemsCount === null || nestedTable?.unpaidItemsCount === null ? null : undefined,
    ),
    unpaidItemsPreview: pickFirst(
      asStringOrNull(record.unpaidItemsPreview),
      asStringOrNull(nestedTable?.unpaidItemsPreview),
    ),
    unpaidItemsTop: pickFirst(
      normalizeTopItems(record.unpaidItemsTop),
      normalizeTopItems(nestedTable?.unpaidItemsTop),
      record.unpaidItemsTop === null || nestedTable?.unpaidItemsTop === null ? null : undefined,
    ),
  };
}

function toOpsTableDto(row: OpsTableRow): OpsTableDto {
  return {
    id: row.tableId,
    branchId: row.branchId,
    code: row.code,
    status: row.tableStatus,
    seats: row.seats,
    area: row.areaName ?? null,
    directionId: row.directionId ?? null,
    sessionKey: row.sessionKey ?? null,
    cartKey: row.cartKey ?? null,
    activeOrdersCount: row.activeOrdersCount ?? 0,
    activeOrderCode: row.activeOrderCode ?? null,
    activeOrderStatus: row.activeOrderStatus ?? null,
    activeOrderUpdatedAt: row.activeOrderUpdatedAt ?? null,
    activeItemsCount: row.activeItemsCount ?? null,
    activeItemsPreview: row.activeItemsPreview ?? null,
    activeItemsTop: row.activeItemsTop ?? null,
    unpaidOrdersCount: row.unpaidOrdersCount ?? 0,
    unpaidOrderCode: row.unpaidOrderCode ?? null,
    unpaidOrderStatus: row.unpaidOrderStatus ?? null,
    unpaidOrderUpdatedAt: row.unpaidOrderUpdatedAt ?? null,
    unpaidItemsCount: row.unpaidItemsCount ?? null,
    unpaidItemsPreview: row.unpaidItemsPreview ?? null,
    unpaidItemsTop: row.unpaidItemsTop ?? null,
  };
}

function extractListItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = asRecord(raw);
  if (!record) return [];
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

function normalizeOpsTablesResponse(raw: unknown): OpsTableDto[] {
  const direct = Schemas.zOpsTableListResponse.safeParse(raw);
  if (direct.success) {
    return direct.data.items.map(toOpsTableDto);
  }

  return extractListItems(raw)
    .map((entry) => Schemas.zOpsTableRow.safeParse(toContractRowCandidate(entry)))
    .filter((entry): entry is { success: true; data: OpsTableRow } => entry.success)
    .map((entry) => toOpsTableDto(entry.data));
}

export async function fetchOpsTables(params: FetchOpsTablesParams = {}): Promise<OpsTableDto[]> {
  const search = new URLSearchParams();
  if (params.branchId != null) search.set("branchId", String(params.branchId));
  const qs = search.toString();
  const path = `/admin/ops/tables${qs ? `?${qs}` : ""}`;
  const res = await apiFetchAuthed<unknown>(path);
  return normalizeOpsTablesResponse(res);
}
