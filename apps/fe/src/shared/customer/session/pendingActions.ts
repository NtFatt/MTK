import { apiFetch } from "../../../lib/apiFetch";

/**
 * Pending actions — UX helper when user triggers an action that requires a table session.
 * Stored in sessionStorage (ephemeral, per-tab).
 */

export type PendingAddCartItem = {
  kind: "ADD_CART_ITEM";
  returnTo: string;
 payload: {
  itemId: string | number;
  quantity: number;
  note?: string;
  optionsHash?: string;
};
};

export type PendingAction = PendingAddCartItem;

const KEY = "hadilao.pendingAction.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function savePendingAction(action: PendingAction) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(KEY, JSON.stringify(action));
}

export function loadPendingAction(): PendingAction | null {
  if (!canUseStorage()) return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingAction;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingAction() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(KEY);
}

type CartLike = {
  cartKey: string;
  items?: Array<{ itemId: string | number; qty: number; note?: string; optionsHash?: string }>;
};

function sameItem(a: any, b: any) {
  return String(a?.itemId) === String(b?.itemId) && String(a?.optionsHash ?? "") === String(b?.optionsHash ?? "");
}

/**
 * Apply pending action once a sessionKey exists.
 * - Only clears pending action after a successful apply.
 */
export async function applyPendingAction(
  sessionKey: string,
  branchId?: string | number | null
): Promise<{ applied: boolean; returnTo?: string }> {
  const action = loadPendingAction();
  if (!action) return { applied: false };

  if (action.kind === "ADD_CART_ITEM") {
    const bidNum = Number(branchId);
    if (!Number.isFinite(bidNum) || bidNum <= 0) {
      // không đủ info để apply → đừng throw để khỏi spam error
      return { applied: false, returnTo: action.returnTo };
    }

    // 1) open cart for session (BE require branchId)
    const cart = await apiFetch<CartLike>(
      `/carts/session/${encodeURIComponent(sessionKey)}?branchId=${encodeURIComponent(String(bidNum))}`,
      {
        method: "POST",
        body: JSON.stringify({ branchId: bidNum }),
      }
    );

    if (!cart?.cartKey) throw new Error("Cart key missing");

    // 2) upsert 1 item theo schema mới
    const p: any = action.payload;
    const quantity = Number(p.quantity ?? p.qty ?? 1);
    const q = Number.isFinite(quantity) ? Math.max(1, Math.trunc(quantity)) : 1;

    await apiFetch(`/carts/${encodeURIComponent(cart.cartKey)}/items`, {
      method: "PUT",
      body: JSON.stringify({
        itemId: String(p.itemId),
        quantity: q,
        // itemOptions: p.itemOptions (nếu sau này có)
      }),
    });

    clearPendingAction();
    return { applied: true, returnTo: action.returnTo };
  }

  return { applied: false };
}