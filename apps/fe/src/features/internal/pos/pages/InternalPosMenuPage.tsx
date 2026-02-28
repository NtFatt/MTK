import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { posStore } from "../../ops/posStore";
import { apiFetch } from "../../../../lib/apiFetch";
import { createOpsOrderFromCart } from "../services/posOrdersApi";
import {
  getOrCreateOpsCartBySessionKey,
  extractCartKey,
  getOpsCart,
  normalizeOpsCartItems,
  putOpsCartItems,
} from "../../ops/tables/services/opsCartsApi";

type MenuItem = {
  id: string | number;
  name?: string;
  price?: number;
  remainingQty?: number;
};

type CartItem = { itemId: string; qty: number; note?: string };

export function InternalPosMenuPage() {
  const nav = useNavigate();

  const tableCode = useStore(posStore, (s) => s.tableCode);
  const sessionKey = useStore(posStore, (s) => s.sessionKey);
  const cartKey = useStore(posStore, (s) => s.cartKey);
  const clear = useStore(posStore, (s) => s.clear);
  const setSession = useStore(posStore, (s) => s.setSession);

  const authSession = useStore(authStore, (s) => s.session);
  const fallbackBranchId = authSession?.branchId ?? null;
  const hasHydrated = useStore(posStore, (s) => s._hasHydrated);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const ready = hasHydrated && !!sessionKey;

  const totalQty = useMemo(() => cartItems.reduce((s, x) => s + (x.qty || 0), 0), [cartItems]);

  // luôn gọi hook, nhưng guard bên trong
  useEffect(() => {
    if (hasHydrated && !sessionKey) nav("/i/pos/tables", { replace: true });
  }, [hasHydrated, sessionKey, nav]);

  // ✅ 1 effect duy nhất: ensure cart -> load cart -> lấy branchId -> fetch menu
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      // ensure cart
      const c = await getOrCreateOpsCartBySessionKey(sessionKey!);
      const ck = extractCartKey(c);
      if (ck) setSession({ sessionKey: sessionKey!, cartKey: ck });

      if (!ck) {
        if (!cancelled) {
          setCartItems([]);
          setMenuItems([]);
        }
        return;
      }

      // load cart detail
      const detail: any = await getOpsCart(ck);

      // cart response có cart.branchId => lấy cái này làm chuẩn
      const bid = detail?.cart?.branchId ?? fallbackBranchId ?? null;

      // set cart items (normalize -> CartItem)
      const items = (normalizeOpsCartItems(detail) as any[]) ?? [];
      if (!cancelled) {
        setCartItems(
          items.map((it) => ({
            itemId: String(it.itemId),
            qty: Number(it.qty ?? 1),
            note: typeof it.note === "string" ? it.note : undefined,
          }))
        );
      }

      // fetch menu
      if (bid != null) {
        if (!cancelled) setLoadingMenu(true);

        const res = await apiFetch<any>(`/menu/items?branchId=${encodeURIComponent(String(bid))}&limit=200`);
        const raw = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];

        const norm: MenuItem[] = raw.map((it: any) => {
          const rq =
            (typeof it?.remainingQty === "number" ? it.remainingQty : undefined) ??
            (typeof it?.stockQty === "number" ? it.stockQty : undefined) ??
            (typeof it?.stock_qty === "number" ? it.stock_qty : undefined) ??
            (typeof it?.quantity === "number" ? it.quantity : undefined) ??
            (typeof it?.qty === "number" ? it.qty : undefined);

          return {
            ...it,
            remainingQty: typeof rq === "number" && Number.isFinite(rq) ? rq : undefined,
          };
        });

        if (!cancelled) {
          setMenuItems(norm);
          setLoadingMenu(false);
        }
      } else {
        if (!cancelled) setMenuItems([]);
      }
    })().catch((e) => {
      console.error("[POS] load failed", e);
      if (!cancelled) setLoadingMenu(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ready, sessionKey, setSession, fallbackBranchId]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of menuItems) {
      const id = String(it?.id ?? "");
      const name = String(it?.name ?? "");
      if (id && name) m.set(id, name);
    }
    return m;
  }, [menuItems]);

  async function setQty(itemId: string, qty: number) {
    if (!ready) return;

    setBusy(true);
    try {
      const c = await getOrCreateOpsCartBySessionKey(sessionKey!);
      const ck = extractCartKey(c) || cartKey;
      if (!ck) throw new Error("Missing cartKey");

      await putOpsCartItems(ck, { itemId: String(itemId), qty: Math.max(0, qty) });

      const detail2: any = await getOpsCart(ck);
      setCartItems(normalizeOpsCartItems(detail2));
      setSession({ sessionKey: sessionKey!, cartKey: ck });
    } finally {
      setBusy(false);
    }
  }

  async function addItem(itemId: string) {
    const current = cartItems.find((x) => x.itemId === String(itemId))?.qty ?? 0;
    return setQty(itemId, current + 1);
  }

  async function inc(itemId: string) {
    const current = cartItems.find((x) => x.itemId === String(itemId))?.qty ?? 0;
    return setQty(itemId, current + 1);
  }

  async function dec(itemId: string) {
    const current = cartItems.find((x) => x.itemId === String(itemId))?.qty ?? 0;
    return setQty(itemId, current - 1);
  }

  // ✅ return sau hooks => không vi phạm rules-of-hooks
  if (!hasHydrated) return null;
  if (!sessionKey) return null;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">POS — Gọi món (Bàn {tableCode ?? "—"})</h1>
          <p className="mt-1 text-sm text-muted-foreground">Session: {sessionKey}</p>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
          onClick={() => {
            clear();
            nav("/i/pos/tables");
          }}
          type="button"
        >
          Đổi bàn
        </button>
      </div>

      {warn && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warn}</div>
      )}

      {checkoutError && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {checkoutError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* MENU */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 font-medium">Thực đơn</div>

          {loadingMenu ? (
            <div className="text-sm text-muted-foreground">Đang tải menu...</div>
          ) : menuItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">Không tải được menu / không có món.</div>
          ) : (
            <div className="space-y-2">
              {menuItems.slice(0, 60).map((it) => {
                const remain = typeof it.remainingQty === "number" ? it.remainingQty : null;

                return (
                  <div key={String(it.id)} className="flex items-center justify-between gap-3 border-b pb-2">
                    <div className="min-w-0">
                      <div className="truncate">
                        {it.name ?? `#${it.id}`}

                        {remain != null && remain > 0 && remain <= 5 && (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Còn {remain}</span>
                        )}

                        {remain != null && remain <= 0 && (
                          <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Hết hàng</span>
                        )}
                      </div>

                      {it.price != null && (
                        <div className="text-xs text-muted-foreground">{Number(it.price).toLocaleString("vi-VN")} đ</div>
                      )}
                    </div>

                    <button
                      className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        setCheckoutError(null);
                        setWarn(null);

                        const remain = typeof it.remainingQty === "number" ? it.remainingQty : null;
                        const current = cartItems.find((x) => x.itemId === String(it.id))?.qty ?? 0;

                        if (remain != null) {
                          if (remain <= 0) {
                            setWarn(`"${it.name ?? it.id}" đã hết hàng.`);
                            return;
                          }
                          if (current + 1 > remain) {
                            setWarn(`"${it.name ?? it.id}" chỉ còn ${remain}. Vui lòng giảm số lượng.`);
                            return;
                          }
                          if (remain <= 5) setWarn(`Cảnh báo: "${it.name ?? it.id}" sắp hết, còn ${remain}.`);
                        }

                        void addItem(String(it.id));
                      }}
                      type="button"
                    >
                      Thêm
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CART SUMMARY */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 font-medium">Giỏ (OPS)</div>

          {cartItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa có món</div>
          ) : (
            <ul className="space-y-2">
              {cartItems.map((x) => (
                <li key={`${x.itemId}-${x.note ?? ""}`} className="flex items-center justify-between gap-3">
                  <span className="truncate">{nameById.get(x.itemId) ?? `#${x.itemId}`}</span>

                  <div className="flex items-center gap-2">
                    <button
                      className="h-8 w-8 rounded-md border text-sm disabled:opacity-60"
                      disabled={busy || x.qty <= 0}
                      onClick={() => void dec(x.itemId)}
                      type="button"
                      aria-label="Giảm"
                    >
                      −
                    </button>

                    <span className="w-8 text-center font-mono">{x.qty}</span>

                    <button
                      className="h-8 w-8 rounded-md border text-sm disabled:opacity-60"
                      disabled={busy}
                      onClick={() => void inc(x.itemId)}
                      type="button"
                      aria-label="Tăng"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 mt-6 rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {cartItems.length} món • Tổng {totalQty}
          </div>

          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            disabled={busy || cartItems.length === 0 || !sessionKey}
            onClick={() =>
              void (async () => {
                setWarn(null);
                setCheckoutError(null);
                setBusy(true);
                try {
                  const c = await getOrCreateOpsCartBySessionKey(sessionKey);
                  const ck = extractCartKey(c) || cartKey;
                  if (!ck) throw new Error("Missing cartKey");

                  const res = await createOpsOrderFromCart(ck);
                  console.log("ORDER CREATED", res);

                  const detail2: any = await getOpsCart(ck);
                  setCartItems(normalizeOpsCartItems(detail2));
                } catch (e: any) {
                  const code = e?.code ?? e?.error?.code ?? e?.response?.code;
                  if (code === "OUT_OF_STOCK") {
                    setCheckoutError(
                      "Không đủ tồn kho để đặt món. Vui lòng giảm số lượng các món sắp hết/hết hàng."
                    );
                  } else {
                    setCheckoutError(String(e?.message ?? "Đặt món thất bại"));
                  }
                } finally {
                  setBusy(false);
                }
              })()
            }
            type="button"
          >
            Đặt món
          </button>
        </div>
      </div>
    </main>
  );
}