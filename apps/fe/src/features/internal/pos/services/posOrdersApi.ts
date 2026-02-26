import { apiFetchAuthed } from "../../../../shared/http/authedFetch";
export async function createOpsOrderFromCart(cartKey: string) {
  return apiFetchAuthed<any>(`/admin/ops/orders/from-cart/${encodeURIComponent(cartKey)}`, {
    method: "POST",
  });
}