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
    qty: number;
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
export async function applyPendingAction(sessionKey: string): Promise<{ applied: boolean; returnTo?: string }> {
  const action = loadPendingAction();
  if (!action) return { applied: false };

  if (action.kind === "ADD_CART_ITEM") {
    // Ensure a cart exists for this session, then upsert items.
    const cart = await apiFetch<CartLike>(`/carts/session/${encodeURIComponent(sessionKey)}`, {
      method: "POST",
    });

    const existing = Array.isArray(cart?.items) ? cart.items : [];
    const nextItem = action.payload;

    const merged = [...existing];
    const idx = merged.findIndex((it) => sameItem(it, nextItem));
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], qty: (merged[idx].qty ?? 0) + (nextItem.qty ?? 1) };
    } else {
      merged.push({
        itemId: nextItem.itemId,
        qty: nextItem.qty ?? 1,
        note: nextItem.note,
        optionsHash: nextItem.optionsHash,
      });
    }

    await apiFetch(`/carts/${encodeURIComponent(cart.cartKey)}/items`, {
      method: "PUT",
      body: JSON.stringify({ items: merged }),
    });

    clearPendingAction();
    return { applied: true, returnTo: action.returnTo };
  }

  return { applied: false };
}
