import { apiFetch } from "../../../../lib/apiFetch";

export type CustomerVoucherPreview = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount: number | null;
  minSubtotal: number;
  usageLimitTotal: number | null;
  usageLimitPerSession: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isValid: boolean;
  invalidReasonCode: string | null;
  invalidReasonMessage: string | null;
  discountAmount: number;
  totalAfterDiscount: number;
  effectivePercent: number;
};

function mapVoucher(raw: any): CustomerVoucherPreview {
  return {
    id: String(raw?.id ?? raw?.voucherId ?? raw?.voucher_id ?? ""),
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
    startsAt: String(raw?.startsAt ?? raw?.starts_at ?? ""),
    endsAt: String(raw?.endsAt ?? raw?.ends_at ?? ""),
    isActive: Boolean(raw?.isActive ?? raw?.is_active ?? false),
    isValid: Boolean(raw?.isValid ?? raw?.is_valid ?? false),
    invalidReasonCode:
      raw?.invalidReasonCode != null || raw?.invalid_reason_code != null
        ? String(raw?.invalidReasonCode ?? raw?.invalid_reason_code ?? "")
        : null,
    invalidReasonMessage:
      raw?.invalidReasonMessage != null || raw?.invalid_reason_message != null
        ? String(raw?.invalidReasonMessage ?? raw?.invalid_reason_message ?? "")
        : null,
    discountAmount: Number(raw?.discountAmount ?? raw?.discount_amount ?? 0),
    totalAfterDiscount: Number(raw?.totalAfterDiscount ?? raw?.total_after_discount ?? 0),
    effectivePercent: Number(raw?.effectivePercent ?? raw?.effective_percent ?? 0),
  };
}

export async function listAvailableVouchers(cartKey: string) {
  const params = new URLSearchParams({ cartKey });
  const res = await apiFetch<any>(`/vouchers?${params.toString()}`);
  return {
    items: Array.isArray(res?.items) ? res.items.map(mapVoucher) : [],
    subtotal: Number(res?.subtotal ?? 0),
    appliedVoucherId:
      res?.appliedVoucherId != null || res?.applied_voucher_id != null
        ? String(res?.appliedVoucherId ?? res?.applied_voucher_id ?? "")
        : null,
  };
}

export async function applyCartVoucher(cartKey: string, code: string) {
  const res = await apiFetch<any>(`/carts/${encodeURIComponent(cartKey)}/voucher`, {
    method: "PUT",
    body: JSON.stringify({ code }),
  });
  return {
    applied: Boolean(res?.applied ?? true),
    subtotal: Number(res?.subtotal ?? 0),
    discount: Number(res?.discount ?? 0),
    total: Number(res?.total ?? 0),
    voucher: mapVoucher(res?.voucher ?? {}),
  };
}

export async function removeCartVoucher(cartKey: string) {
  const res = await apiFetch<any>(`/carts/${encodeURIComponent(cartKey)}/voucher`, {
    method: "DELETE",
  });
  return { removed: Boolean(res?.removed ?? true) };
}
