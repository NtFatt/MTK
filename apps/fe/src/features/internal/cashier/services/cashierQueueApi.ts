import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type CashierOrderItem = {
  orderItemId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemOptions: Record<string, unknown> | null;
  pricingBreakdown: Record<string, unknown> | null;
};

export type CashierOrderRow = {
  orderId?: string;
  orderCode: string;
  orderStatus: string;
  createdAt?: string;
  updatedAt?: string;
  branchId: string | null;
  tableCode: string | null;
  sessionOpenedAt?: string | null;
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  voucherCode?: string | null;
  voucherName?: string | null;
  orderNote?: string | null;
  totalItemCount?: number;
  uniqueItemCount?: number;
  items: CashierOrderItem[];
};

export type FetchCashierQueueParams = {
  branchId?: string | number | null;
  limit?: number;
};

function normalizeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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

function normalizeRows(raw: unknown): CashierOrderRow[] {
  const rows: unknown[] =
    Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as any).items)
        ? (raw as any).items
        : [];

  return rows
    .map<CashierOrderRow | null>((entry: any) => {
      const orderCode = String(entry?.orderCode ?? entry?.order_code ?? "").trim();
      if (!orderCode) return null;

      const items: CashierOrderItem[] = Array.isArray(entry?.items)
        ? entry.items
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
                unitPrice: Number(item?.unitPrice ?? item?.unit_price ?? 0),
                lineTotal: Number(item?.lineTotal ?? item?.line_total ?? 0),
                itemOptions: normalizeJson(item?.itemOptions ?? item?.item_options ?? null),
                pricingBreakdown: normalizeJson(item?.pricingBreakdown ?? item?.pricing_breakdown ?? null),
              } satisfies CashierOrderItem;
            })
            .filter((item: CashierOrderItem | null): item is CashierOrderItem => item != null)
        : [];

      return {
        orderId:
          typeof entry?.orderId === "string"
            ? entry.orderId
            : typeof entry?.order_id === "string"
              ? entry.order_id
              : undefined,
        orderCode,
        orderStatus: String(entry?.orderStatus ?? entry?.order_status ?? ""),
        createdAt:
          typeof entry?.createdAt === "string"
            ? entry.createdAt
            : typeof entry?.created_at === "string"
              ? entry.created_at
              : undefined,
        updatedAt:
          typeof entry?.updatedAt === "string"
            ? entry.updatedAt
            : typeof entry?.updated_at === "string"
              ? entry.updated_at
              : undefined,
        branchId: entry?.branchId == null ? null : String(entry.branchId),
        tableCode: entry?.tableCode == null ? null : String(entry.tableCode),
        sessionOpenedAt:
          typeof entry?.sessionOpenedAt === "string"
            ? entry.sessionOpenedAt
            : typeof entry?.session_opened_at === "string"
              ? entry.session_opened_at
              : null,
        subtotalAmount: normalizeNumber(entry?.subtotalAmount ?? entry?.subtotal_amount),
        discountAmount: normalizeNumber(entry?.discountAmount ?? entry?.discount_amount),
        totalAmount: normalizeNumber(entry?.totalAmount ?? entry?.total_amount ?? entry?.total),
        voucherCode:
          entry?.voucherCode == null && entry?.voucher_code == null
            ? null
            : String(entry?.voucherCode ?? entry?.voucher_code ?? ""),
        voucherName:
          entry?.voucherName == null && entry?.voucher_name == null
            ? null
            : String(entry?.voucherName ?? entry?.voucher_name ?? ""),
        orderNote:
          entry?.orderNote == null && entry?.order_note == null
            ? null
            : String(entry?.orderNote ?? entry?.order_note ?? ""),
        totalItemCount:
          normalizeNumber(entry?.totalItemCount ?? entry?.total_item_count) ??
          items.reduce((sum: number, item: CashierOrderItem) => sum + item.quantity, 0),
        uniqueItemCount:
          normalizeNumber(entry?.uniqueItemCount ?? entry?.unique_item_count) ?? items.length,
        items,
      } satisfies CashierOrderRow;
    })
    .filter((entry: CashierOrderRow | null): entry is CashierOrderRow => entry != null);
}

export async function fetchCashierQueue(params: FetchCashierQueueParams = {}): Promise<CashierOrderRow[]> {
  const query = new URLSearchParams();

  if (params.branchId != null && String(params.branchId).trim()) {
    query.set("branchId", String(params.branchId).trim());
  }
  if (params.limit != null && Number.isFinite(Number(params.limit))) {
    query.set("limit", String(Math.max(1, Math.floor(Number(params.limit)))));
  }

  const path = query.toString()
    ? `/admin/cashier/unpaid?${query.toString()}`
    : "/admin/cashier/unpaid";

  const res = await apiFetchAuthed<unknown>(path);
  return normalizeRows(res);
}
