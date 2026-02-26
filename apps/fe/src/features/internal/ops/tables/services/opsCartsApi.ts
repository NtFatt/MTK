import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

export async function getOrCreateOpsCartBySessionKey(sessionKey: string) {
  return apiFetchAuthed<any>(`/admin/ops/carts/session/${encodeURIComponent(sessionKey)}`, {
    method: "POST",
  });
}

export async function getOpsCart(cartKey: string) {
  return apiFetchAuthed<any>(`/admin/ops/carts/${encodeURIComponent(cartKey)}`, {
    method: "GET",
  });
}
// ...

export async function putOpsCartItems(cartKey: string, payload: { itemId: string; qty: number; note?: string }) {
  const path = `/admin/ops/carts/${encodeURIComponent(cartKey)}/items`;
  return apiFetchAuthed(path, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function extractCartKey(res: any): string {
  const ck =
    res?.cartKey ??
    res?.cart_key ??
    res?.data?.cartKey ??
    res?.data?.cart_key ??
    res?.cart?.cartKey ??
    res?.cart?.cart_key ??
    res?.data?.cart?.cartKey ??
    res?.data?.cart?.cart_key;

  return typeof ck === "string" && ck.trim() ? ck.trim() : "";
}

export type OpsCartItemUi = {
  itemId: string;
  name?: string;
  qty: number;
  note?: string;
  optionsHash?: string;
};

export function normalizeOpsCartItems(res: any): OpsCartItemUi[] {
  const cart = res?.cart ?? res?.data?.cart ?? res;
  const items = Array.isArray(cart?.items) ? cart.items : Array.isArray(res?.items) ? res.items : [];
  return items
    .map((it: any) => ({
      itemId: String(it?.itemId ?? it?.menuItemId ?? it?.id ?? "").trim(),
      name: typeof it?.name === "string" ? it.name : typeof it?.itemName === "string" ? it.itemName : undefined,
      qty: Number(it?.qty ?? it?.quantity ?? 0) || 0,
      note: typeof it?.note === "string" ? it.note : undefined,
      optionsHash: typeof it?.optionsHash === "string" ? it.optionsHash : undefined,
    }))
    .filter((x: { itemId: any; qty: number; }) => x.itemId && x.qty > 0);
}

export function extractCartCreatedAt(res: any): string | undefined {
  const cart = res?.cart ?? res?.data?.cart ?? res;
  const t =
    cart?.createdAt ??
    cart?.created_at ??
    res?.createdAt ??
    res?.created_at;
  return typeof t === "string" && t.trim() ? t : undefined;
}