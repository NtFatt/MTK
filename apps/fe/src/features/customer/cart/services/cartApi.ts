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
  const res = await apiFetch<Cart>(`/carts/${encodeURIComponent(cartKey)}`);
  return withCartKey(res, cartKey);
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