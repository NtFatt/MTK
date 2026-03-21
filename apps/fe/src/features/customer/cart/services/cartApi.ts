/**
 * Cart API — contract-first (match BE).
 * POST /api/v1/carts/session/:sessionKey
 * GET  /api/v1/carts/:cartKey
 * PUT  /api/v1/carts/:cartKey/items
 * DEL  /api/v1/carts/:cartKey/items/:itemId?optionsHash=...
 */
import { apiFetch } from "../../../../lib/apiFetch";
import type { Cart } from "../types";

type OpenCartResponse = {
  cartKey?: string;
  cart_key?: string;
  cartStatus?: string;
  cart_status?: string;
  data?: any;
};

function extractCartKey(x: any): string {
  const ck =
    x?.cartKey ??
    x?.cart_key ??
    x?.key ??
    x?.data?.cartKey ??
    x?.data?.cart_key ??
    x?.data?.key ??
    x?.data?.cart?.cartKey ??
    x?.data?.cart?.cart_key ??
    x?.cart?.cartKey ??
    x?.cart?.cart_key;

  return typeof ck === "string" && ck.trim() ? ck.trim() : "";
}

function withCartKey(cart: any, fallbackCartKey: string): Cart {
  const cartKey = extractCartKey(cart) || fallbackCartKey;
  return { ...(cart as any), cartKey } as Cart;
}

function mapVoucher(raw: any) {
  if (!raw || typeof raw !== "object") return null;

  return {
    id: String(raw.id ?? raw.voucherId ?? raw.voucher_id ?? ""),
    code: String(raw.code ?? raw.voucherCode ?? raw.voucher_code ?? ""),
    name: String(raw.name ?? raw.voucherName ?? raw.voucher_name ?? ""),
    description: raw.description ? String(raw.description) : null,
    discountType:
      String(raw.discountType ?? raw.discount_type ?? "PERCENT") === "FIXED_AMOUNT"
        ? "FIXED_AMOUNT"
        : "PERCENT",
    discountValue: Number(raw.discountValue ?? raw.discount_value ?? 0),
    maxDiscountAmount:
      raw.maxDiscountAmount == null && raw.max_discount_amount == null
        ? null
        : Number(raw.maxDiscountAmount ?? raw.max_discount_amount ?? 0),
    minSubtotal: Number(raw.minSubtotal ?? raw.min_subtotal ?? 0),
    usageLimitTotal:
      raw.usageLimitTotal == null && raw.usage_limit_total == null
        ? null
        : Number(raw.usageLimitTotal ?? raw.usage_limit_total ?? 0),
    usageLimitPerSession:
      raw.usageLimitPerSession == null && raw.usage_limit_per_session == null
        ? null
        : Number(raw.usageLimitPerSession ?? raw.usage_limit_per_session ?? 0),
    startsAt: String(raw.startsAt ?? raw.starts_at ?? ""),
    endsAt: String(raw.endsAt ?? raw.ends_at ?? ""),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? false),
    isValid: Boolean(raw.isValid ?? raw.is_valid ?? false),
    invalidReasonCode:
      raw.invalidReasonCode != null || raw.invalid_reason_code != null
        ? String(raw.invalidReasonCode ?? raw.invalid_reason_code ?? "")
        : null,
    invalidReasonMessage:
      raw.invalidReasonMessage != null || raw.invalid_reason_message != null
        ? String(raw.invalidReasonMessage ?? raw.invalid_reason_message ?? "")
        : null,
    discountAmount: Number(raw.discountAmount ?? raw.discount_amount ?? 0),
    totalAfterDiscount: Number(raw.totalAfterDiscount ?? raw.total_after_discount ?? 0),
    effectivePercent: Number(raw.effectivePercent ?? raw.effective_percent ?? 0),
  };
}

function normalizeItemOptions(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function mapOpenBill(raw: any) {
  if (!raw || typeof raw !== "object") return null;

  return {
    orderId: String(raw.orderId ?? raw.order_id ?? ""),
    orderCode: String(raw.orderCode ?? raw.order_code ?? ""),
    status: String(raw.status ?? raw.orderStatus ?? raw.order_status ?? "UNKNOWN"),
    subtotal: Number(raw.subtotal ?? raw.subtotalAmount ?? raw.subtotal_amount ?? 0),
    discount: Number(raw.discount ?? raw.discountAmount ?? raw.discount_amount ?? 0),
    total: Number(raw.total ?? raw.totalAmount ?? raw.total_amount ?? 0),
    voucherCode:
      raw.voucherCode != null || raw.voucher_code != null
        ? String(raw.voucherCode ?? raw.voucher_code ?? "")
        : null,
    voucherName:
      raw.voucherName != null || raw.voucher_name != null
        ? String(raw.voucherName ?? raw.voucher_name ?? "")
        : null,
    voucherDiscountAmount: Number(
      raw.voucherDiscountAmount ?? raw.voucher_discount_amount ?? raw.discountAmount ?? 0
    ),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

// ✅ BE của bạn đang enforce branchId -> bắt buộc truyền branchId
export async function openCartForSession(
  sessionKey: string,
  branchId: string | number
): Promise<{ cartKey: string; cartStatus?: string }> {
  if (!sessionKey) throw new Error("sessionKey is required");

  const bid = Number(branchId);
  if (!Number.isFinite(bid) || bid <= 0) throw new Error("branchId is required");

  const path =
    `/carts/session/${encodeURIComponent(sessionKey)}` +
    `?branchId=${encodeURIComponent(String(bid))}`;

  const res = await apiFetch<OpenCartResponse>(path, {
    method: "POST",
    body: JSON.stringify({ branchId: bid }),
  });

  const cartKey = extractCartKey(res);
  if (!cartKey) throw new Error("Cart key missing from /carts/session response");

  const cartStatus =
    (typeof res?.cartStatus === "string" && res.cartStatus) ||
    (typeof res?.cart_status === "string" && res.cart_status) ||
    (typeof res?.data?.cartStatus === "string" && res.data.cartStatus) ||
    (typeof res?.data?.cart_status === "string" && res.data.cart_status) ||
    undefined;

  return { cartKey, cartStatus };
}

export async function getCart(cartKey: string): Promise<Cart> {
  if (!cartKey) throw new Error("Cart key is missing");

  const res = await apiFetch<any>(`/carts/${encodeURIComponent(cartKey)}`);
  const cart = withCartKey(res, cartKey) as any;

  if (Array.isArray(cart.items)) {
    cart.items = cart.items.map((it: any) => {
      const qtyRaw = it.qty ?? it.quantity;
      const qtyNum = Number(qtyRaw);

      const unitPriceRaw = it.unitPrice ?? it.unit_price ?? it.price;
      const unitPriceNum = Number(unitPriceRaw);

      return {
        ...it,
        itemId: it.itemId ?? it.item_id ?? it.id,
        name: it.name ?? it.itemName ?? it.item_name,
        qty: Number.isFinite(qtyNum) ? Math.max(1, Math.trunc(qtyNum)) : 1,
        unitPrice: Number.isFinite(unitPriceNum) ? unitPriceNum : 0,
        itemOptions: normalizeItemOptions(it.itemOptions ?? it.item_options ?? null),
        note:
          typeof it.note === "string"
            ? it.note
            : typeof it.itemOptions?.note === "string"
              ? it.itemOptions.note
              : typeof it.item_options?.note === "string"
                ? it.item_options.note
                : undefined,
        optionsHash:
          typeof (it.optionsHash ?? it.options_hash) === "string"
            ? String(it.optionsHash ?? it.options_hash)
            : undefined,
      };
    });
  }

  cart.discount = Number(cart.discount ?? cart.discountAmount ?? 0);
  cart.total = Number(cart.total ?? cart.totalAmount ?? cart.subtotal ?? 0);
  cart.subtotal = Number(cart.subtotal ?? cart.subtotalAmount ?? 0);
  cart.voucher = mapVoucher(cart.voucher ?? cart.appliedVoucher ?? null);
  cart.openBill = mapOpenBill(cart.openBill ?? cart.open_bill ?? null);

  return cart as Cart;
}

/** ✅ open -> get detail (luôn trả Cart có cartKey) */
export async function getOrCreateCart(sessionKey: string, branchId: string | number): Promise<Cart> {
  const opened = await openCartForSession(sessionKey, branchId);
  return getCart(opened.cartKey);
}

export type UpsertCartItemBody = {
  itemId: string | number;
  quantity: number;
  itemOptions?: unknown;
};

function toIntQuantity(q: unknown): number {
  const n = typeof q === "number" ? q : Number(q);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.trunc(n));
}

export async function upsertCartItem(cartKey: string, body: UpsertCartItemBody): Promise<void> {
  if (!cartKey) throw new Error("Cart key is missing");
  const itemId = String(body.itemId ?? "").trim();
  if (!itemId) throw new Error("itemId is missing");

  await apiFetch<void>(`/carts/${encodeURIComponent(cartKey)}/items`, {
    method: "PUT",
    body: JSON.stringify({
      itemId,
      quantity: toIntQuantity(body.quantity),
      itemOptions: body.itemOptions ?? undefined,
    }),
  });
}

export async function deleteCartItem(cartKey: string, itemId: string | number, optionsHash?: string): Promise<void> {
  if (!cartKey) throw new Error("Cart key is missing");

  const search = new URLSearchParams();
  if (optionsHash) search.set("optionsHash", optionsHash);

  const qs = search.toString();
  const path =
    `/carts/${encodeURIComponent(cartKey)}/items/${encodeURIComponent(String(itemId))}` +
    (qs ? `?${qs}` : "");

  await apiFetch<void>(path, { method: "DELETE" });
}

export type AddItemPayload = {
  itemId: string | number;
  qty?: number;
  itemOptions?: unknown;
  optionsHash?: string;
  note?: string;
};
