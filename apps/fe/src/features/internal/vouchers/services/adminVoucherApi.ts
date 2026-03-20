import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type AdminVoucher = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount: number | null;
  minSubtotal: number;
  usageLimitTotal: number | null;
  usageLimitPerSession: number | null;
  usageCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type VoucherListResponse = {
  items?: unknown[];
};

function mapVoucher(raw: any): AdminVoucher {
  return {
    id: String(raw?.id ?? raw?.voucherId ?? raw?.voucher_id ?? ""),
    branchId: String(raw?.branchId ?? raw?.branch_id ?? ""),
    code: String(raw?.code ?? raw?.voucherCode ?? raw?.voucher_code ?? ""),
    name: String(raw?.name ?? raw?.voucherName ?? raw?.voucher_name ?? ""),
    description: raw?.description ? String(raw.description) : null,
    discountType:
      String(raw?.discountType ?? raw?.discount_type ?? "PERCENT") === "FIXED_AMOUNT"
        ? "FIXED_AMOUNT"
        : "PERCENT",
    discountValue: Number(raw?.discountValue ?? raw?.discount_value ?? 0),
    maxDiscountAmount:
      raw?.maxDiscountAmount == null && raw?.max_discount_amount == null
        ? null
        : Number(raw?.maxDiscountAmount ?? raw?.max_discount_amount ?? 0),
    minSubtotal: Number(raw?.minSubtotal ?? raw?.min_subtotal ?? 0),
    usageLimitTotal:
      raw?.usageLimitTotal == null && raw?.usage_limit_total == null
        ? null
        : Number(raw?.usageLimitTotal ?? raw?.usage_limit_total ?? 0),
    usageLimitPerSession:
      raw?.usageLimitPerSession == null && raw?.usage_limit_per_session == null
        ? null
        : Number(raw?.usageLimitPerSession ?? raw?.usage_limit_per_session ?? 0),
    usageCount: Number(raw?.usageCount ?? raw?.usage_count ?? 0),
    startsAt: String(raw?.startsAt ?? raw?.starts_at ?? ""),
    endsAt: String(raw?.endsAt ?? raw?.ends_at ?? ""),
    isActive: Boolean(raw?.isActive ?? raw?.is_active ?? false),
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ""),
  };
}

export async function fetchAdminVouchers(input: {
  branchId: string;
  q?: string;
  includeInactive?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("branchId", input.branchId);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.includeInactive !== undefined) {
    params.set("includeInactive", String(input.includeInactive));
  }

  const res = await apiFetchAuthed<VoucherListResponse>(`/admin/vouchers?${params.toString()}`);
  return Array.isArray(res?.items) ? res.items.map(mapVoucher) : [];
}

export type UpsertAdminVoucherPayload = {
  branchId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount?: number | null;
  minSubtotal: number;
  usageLimitTotal?: number | null;
  usageLimitPerSession?: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export async function createAdminVoucher(payload: UpsertAdminVoucherPayload) {
  const res = await apiFetchAuthed<any>("/admin/vouchers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapVoucher(res);
}

export async function updateAdminVoucher(
  voucherId: string,
  payload: Partial<UpsertAdminVoucherPayload> & { branchId: string },
) {
  const res = await apiFetchAuthed<any>(`/admin/vouchers/${encodeURIComponent(voucherId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapVoucher(res);
}

export async function setAdminVoucherActive(input: {
  voucherId: string;
  branchId: string;
  isActive: boolean;
}) {
  const res = await apiFetchAuthed<any>(`/admin/vouchers/${encodeURIComponent(input.voucherId)}/active`, {
    method: "PATCH",
    body: JSON.stringify({
      branchId: input.branchId,
      isActive: input.isActive,
    }),
  });
  return mapVoucher(res);
}
