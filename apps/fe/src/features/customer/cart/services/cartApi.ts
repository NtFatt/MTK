/**
 * Cart API — contract-first.
 * POST /api/v1/carts/session/:sessionKey (get/create), GET /carts/:cartKey, PUT /carts/:cartKey/items, DELETE /carts/:cartKey/items/:itemId
 */
import { apiFetch } from "../../../../lib/apiFetch";
import type { Cart, CartItem, UpsertCartItemsBody } from "../types";

export async function getOrCreateCart(sessionKey: string): Promise<Cart> {
  const path = `/carts/session/${encodeURIComponent(sessionKey)}`;
  return apiFetch<Cart>(path, { method: "POST" });
}

export async function getCart(cartKey: string): Promise<Cart> {
  return apiFetch<Cart>(`/carts/${encodeURIComponent(cartKey)}`);
}

export async function putCartItems(cartKey: string, body: UpsertCartItemsBody): Promise<Cart> {
  return apiFetch<Cart>(`/carts/${encodeURIComponent(cartKey)}/items`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCartItem(cartKey: string, itemId: string | number): Promise<void> {
  await apiFetch<void>(
    `/carts/${encodeURIComponent(cartKey)}/items/${encodeURIComponent(String(itemId))}`,
    { method: "DELETE" }
  );
}

export type AddItemPayload = {
  itemId: string | number;
  qty: number;
  note?: string;
  optionsHash?: string;
};
