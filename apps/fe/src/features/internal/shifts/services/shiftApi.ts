import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export const SHIFT_DENOMINATIONS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;

export type ShiftCode = "MORNING" | "EVENING";
export type ShiftStatus =
  | "OPEN"
  | "CLOSING_REVIEW"
  | "CLOSED"
  | "FORCE_CLOSED"
  | "CANCELLED";

export type ShiftBreakdownInput = {
  denomination: number;
  quantity: number;
};

export type ShiftBreakdownRow = ShiftBreakdownInput & {
  amount: number;
};

export type ShiftSummary = {
  openingFloat: number;
  cashSales: number;
  nonCashSales: number;
  cashIn: number;
  cashOut: number;
  refunds: number;
  expectedCash: number;
  unpaidCount: number;
  paidOrderCount: number;
  lastPaymentAt: string | null;
};

export type ShiftTemplate = {
  code: ShiftCode;
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
};

export type ShiftRunView = {
  shiftRunId: string;
  branchId: string;
  businessDate: string;
  shiftCode: ShiftCode;
  shiftName: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  status: ShiftStatus;
  openedByUserId: string;
  openedByName: string;
  closedByUserId: string | null;
  closedByName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  openingNote: string | null;
  closeNote: string | null;
  version: number;
  openingBreakdown: ShiftBreakdownRow[];
  countedBreakdown: ShiftBreakdownRow[];
  summary: ShiftSummary;
};

export type ShiftCurrentPayload = {
  current: ShiftRunView | null;
  templates: ShiftTemplate[];
};

export type OpenShiftPayload = {
  businessDate: string;
  shiftCode: ShiftCode;
  openingFloat: number;
  openingBreakdown: ShiftBreakdownInput[];
  note?: string | null;
};

export type CloseShiftPayload = {
  branchId: string;
  countedBreakdown: ShiftBreakdownInput[];
  note?: string | null;
  expectedVersion?: number | null;
};

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeBreakdown(raw: unknown): ShiftBreakdownRow[] {
  const rows = Array.isArray(raw) ? raw : [];
  const byDenomination = new Map<number, number>();

  for (const row of rows as any[]) {
    const denomination = toNumber(row?.denomination);
    const quantity = toNumber(row?.quantity);
    if (!SHIFT_DENOMINATIONS.includes(denomination as (typeof SHIFT_DENOMINATIONS)[number])) continue;
    byDenomination.set(denomination, Math.max(0, quantity));
  }

  return SHIFT_DENOMINATIONS.map((denomination) => {
    const quantity = byDenomination.get(denomination) ?? 0;
    return {
      denomination,
      quantity,
      amount: denomination * quantity,
    };
  });
}

function normalizeSummary(raw: any): ShiftSummary {
  return {
    openingFloat: toNumber(raw?.openingFloat),
    cashSales: toNumber(raw?.cashSales),
    nonCashSales: toNumber(raw?.nonCashSales),
    cashIn: toNumber(raw?.cashIn),
    cashOut: toNumber(raw?.cashOut),
    refunds: toNumber(raw?.refunds),
    expectedCash: toNumber(raw?.expectedCash),
    unpaidCount: toNumber(raw?.unpaidCount),
    paidOrderCount: toNumber(raw?.paidOrderCount),
    lastPaymentAt: toNullableString(raw?.lastPaymentAt),
  };
}

function normalizeShift(raw: any): ShiftRunView {
  return {
    shiftRunId: String(raw?.shiftRunId ?? raw?.shift_run_id ?? ""),
    branchId: String(raw?.branchId ?? raw?.branch_id ?? ""),
    businessDate: String(raw?.businessDate ?? raw?.business_date ?? ""),
    shiftCode: String(raw?.shiftCode ?? raw?.shift_code ?? "MORNING").toUpperCase() as ShiftCode,
    shiftName: String(raw?.shiftName ?? raw?.shift_name ?? ""),
    startTime: String(raw?.startTime ?? raw?.start_time ?? ""),
    endTime: String(raw?.endTime ?? raw?.end_time ?? ""),
    crossesMidnight: Boolean(raw?.crossesMidnight ?? raw?.crosses_midnight),
    status: String(raw?.status ?? "OPEN").toUpperCase() as ShiftStatus,
    openedByUserId: String(raw?.openedByUserId ?? raw?.opened_by_user_id ?? ""),
    openedByName: String(raw?.openedByName ?? raw?.opened_by_name ?? ""),
    closedByUserId: toNullableString(raw?.closedByUserId ?? raw?.closed_by_user_id),
    closedByName: toNullableString(raw?.closedByName ?? raw?.closed_by_name),
    openedAt: String(raw?.openedAt ?? raw?.opened_at ?? ""),
    closedAt: toNullableString(raw?.closedAt ?? raw?.closed_at),
    openingFloat: toNumber(raw?.openingFloat ?? raw?.opening_float),
    expectedCash: toNumber(raw?.expectedCash ?? raw?.expected_cash),
    countedCash:
      raw?.countedCash == null && raw?.counted_cash == null
        ? null
        : toNumber(raw?.countedCash ?? raw?.counted_cash),
    variance: raw?.variance == null ? null : toNumber(raw?.variance),
    openingNote: toNullableString(raw?.openingNote ?? raw?.opening_note),
    closeNote: toNullableString(raw?.closeNote ?? raw?.close_note),
    version: toNumber(raw?.version),
    openingBreakdown: normalizeBreakdown(raw?.openingBreakdown ?? raw?.opening_breakdown),
    countedBreakdown: normalizeBreakdown(raw?.countedBreakdown ?? raw?.counted_breakdown),
    summary: normalizeSummary(raw?.summary),
  };
}

function normalizeTemplate(raw: any): ShiftTemplate {
  return {
    code: String(raw?.code ?? "MORNING").toUpperCase() as ShiftCode,
    name: String(raw?.name ?? ""),
    startTime: String(raw?.startTime ?? raw?.start_time ?? ""),
    endTime: String(raw?.endTime ?? raw?.end_time ?? ""),
    crossesMidnight: Boolean(raw?.crossesMidnight ?? raw?.crosses_midnight),
  };
}

export async function fetchCurrentShift(branchId: string): Promise<ShiftCurrentPayload> {
  const query = new URLSearchParams();
  query.set("branchId", branchId);

  const raw = await apiFetchAuthed<any>(`/admin/shifts/current?${query.toString()}`);
  return {
    current: raw?.current ? normalizeShift(raw.current) : null,
    templates: Array.isArray(raw?.templates) ? raw.templates.map(normalizeTemplate) : [],
  };
}

export async function fetchShiftHistory(branchId: string, limit = 12): Promise<ShiftRunView[]> {
  const query = new URLSearchParams();
  query.set("branchId", branchId);
  query.set("limit", String(Math.max(1, Math.min(50, Math.floor(limit)))));

  const raw = await apiFetchAuthed<any>(`/admin/shifts/history?${query.toString()}`);
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items.map(normalizeShift);
}

export async function openShift(
  branchId: string,
  payload: OpenShiftPayload,
  idempotencyKey?: string,
): Promise<ShiftRunView> {
  const raw = await apiFetchAuthed<any>(`/admin/shifts/${encodeURIComponent(branchId)}/open`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeShift(raw);
}

export async function closeShift(
  shiftRunId: string,
  payload: CloseShiftPayload,
  idempotencyKey?: string,
): Promise<ShiftRunView> {
  const raw = await apiFetchAuthed<any>(`/admin/shifts/${encodeURIComponent(shiftRunId)}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  return normalizeShift(raw);
}
