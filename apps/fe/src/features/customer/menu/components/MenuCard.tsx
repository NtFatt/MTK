import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import type { MenuItem } from "../types";
import { Card, CardContent, CardFooter, CardHeader } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { customerSessionStore, selectSessionKey } from "../../../../shared/customer/session/sessionStore";
import { recoverInvalidCustomerSession } from "../../../../shared/customer/session/sessionRecovery";
import { useAddCartItem } from "../../cart/hooks/useCartMutations";
import { savePendingAction } from "../../../../shared/customer/session/pendingActions";
import { CustomerMenuItemCustomizer } from "./CustomerMenuItemCustomizer";

const ADD_FEEDBACK_MS = 1200;
const FLIGHT_MS = 820;

type MenuCardProps = {
  item: MenuItem;
  variant?: "card" | "book";
};

type FlightToken = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  imageUrl?: string;
  label: string;
};

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

function joinSearchableText(item: MenuItem): string {
  return [item.name, ...(item.tags ?? [])].join(" ").toLowerCase();
}

function matchesKeyword(item: MenuItem, keywords: string[]): boolean {
  const haystack = joinSearchableText(item);
  return keywords.some((keyword) => haystack.includes(keyword));
}

function isSteamyItem(item: MenuItem): boolean {
  return matchesKeyword(item, ["lau", "lẩu", "hotpot", "broth", "soup", "spicy", "cay"]);
}

function pickTapeLabel(item: MenuItem): string | null {
  if (matchesKeyword(item, ["moi", "mới", "new"])) return "Mới";
  if (matchesKeyword(item, ["combo"])) return "Combo hot";
  if (matchesKeyword(item, ["signature", "đặc", "dac", "best"])) return "Đặc trưng";
  if (isSteamyItem(item)) return "Nồi nóng";
  return null;
}

function buildServingNote(item: MenuItem): string {
  if (matchesKeyword(item, ["combo"])) {
    return "Gợi ý gọi nhanh cho bàn đông, lên món đều và rất dễ chia sẻ.";
  }
  if (isSteamyItem(item)) {
    return "Nên gọi sớm để nồi lên bàn trước, giữ nhịp ăn cho cả bàn thật mượt.";
  }
  if (matchesKeyword(item, ["rau", "nam", "nấm", "vegetable", "mushroom"])) {
    return "Món ăn kèm nhẹ vị, cân bằng nồi lẩu và hợp gọi thêm theo đợt.";
  }
  if (matchesKeyword(item, ["bo", "bò", "thit", "thịt", "beef"])) {
    return "Món chủ lực cho nồi đang sôi, hợp ăn nóng và chấm đậm vị.";
  }
  return "Món gọi kèm dễ ăn, lên bàn gọn và hợp nhiều kiểu nước lẩu.";
}

function resolveCartTargetRect(): DOMRect | null {
  if (typeof document === "undefined") return null;

  const selectors = ['[data-cart-target="sticky"]', '[data-cart-target="nav"]'];
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return rect;
    }
  }

  return null;
}

export function MenuCard({ item, variant = "card" }: MenuCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionKey = useStore(customerSessionStore, selectSessionKey);
  const addCartItem = useAddCartItem(sessionKey);

  const actionRef = useRef<HTMLDivElement | null>(null);
  const flightIdRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);

  const [addedFeedback, setAddedFeedback] = useState(false);
  const [flightTokens, setFlightTokens] = useState<FlightToken[]>([]);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [apiOutOfStock, setApiOutOfStock] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(`oos:${item.id}`) === "1";
  });

  const remain = item.remainingQty;
  const recoveredAvailability = item.isAvailable && (remain == null || remain > 0);
  const effectiveApiOutOfStock = apiOutOfStock && !recoveredAvailability;
  const outOfStock =
    effectiveApiOutOfStock || !item.isAvailable || (remain != null && remain <= 0);

  const tapeLabel = pickTapeLabel(item);
  const steamy = isSteamyItem(item);
  const servingNote = buildServingNote(item);
  const isBookVariant = variant === "book";
  const primaryActionLabel = outOfStock
    ? isBookVariant
      ? "Hết"
      : "Hết hàng"
    : addedFeedback
      ? isBookVariant
        ? "Đã thêm"
        : "Đã thêm vào nồi"
      : addCartItem.isPending
        ? isBookVariant
          ? "Đang thêm"
          : "Đang thêm..."
        : isBookVariant
          ? "Gọi món"
          : "Thêm vào giỏ";

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);

    timeoutIdsRef.current.push(timeoutId);
  };

  const launchCartAnimation = () => {
    const originRect = actionRef.current?.getBoundingClientRect();
    const targetRect = resolveCartTargetRect();

    if (!originRect || !targetRect) return;

    const id = flightIdRef.current++;
    const token: FlightToken = {
      id,
      startX: originRect.left + originRect.width * 0.5,
      startY: originRect.top + originRect.height * 0.3,
      endX: targetRect.left + targetRect.width * 0.5,
      endY: targetRect.top + targetRect.height * 0.5,
      imageUrl: item.imageUrl,
      label: item.name.charAt(0).toUpperCase(),
    };

    setFlightTokens((current) => [...current, token]);
    scheduleTimeout(() => {
      setFlightTokens((current) => current.filter((entry) => entry.id !== id));
    }, FLIGHT_MS);
  };

  const handleAdd = (payload?: { qty?: number; itemOptions?: Record<string, unknown> }) => {
    if (outOfStock) return;

    if (apiOutOfStock && recoveredAvailability) {
      setApiOutOfStock(false);
      window.sessionStorage.removeItem(`oos:${item.id}`);
    }

    const quantity = Math.max(1, Math.trunc(payload?.qty ?? 1));
    const itemOptions = payload?.itemOptions;

    if (!sessionKey) {
      const next = `${location.pathname}${location.search}`;
      savePendingAction({
        kind: "ADD_CART_ITEM",
        returnTo: next,
        payload: { itemId: item.id, quantity, note: "", itemOptions },
      });
      navigate(`/c/qr?next=${encodeURIComponent(next)}`);
      return;
    }

    addCartItem.mutate(
      { itemId: item.id, qty: quantity, note: "", itemOptions },
      {
        onSuccess: () => {
          setAddedFeedback(true);
          setShowCustomizer(false);
          launchCartAnimation();
          scheduleTimeout(() => setAddedFeedback(false), ADD_FEEDBACK_MS);
        },
        onError: (err: any) => {
          const code = err?.code ?? err?.error?.code ?? err?.response?.data?.code;
          if (code === "OUT_OF_STOCK") {
            setApiOutOfStock(true);
            window.sessionStorage.setItem(`oos:${item.id}`, "1");
            return;
          }

          if (
            recoverInvalidCustomerSession(err, {
              beforeClear: () => {
                savePendingAction({
                  kind: "ADD_CART_ITEM",
                  returnTo: `${location.pathname}${location.search}`,
                  payload: { itemId: item.id, quantity, note: "", itemOptions },
                });
              },
            })
          ) {
            return;
          }
        },
      }
    );
  };

  return (
    <>
      {isBookVariant ? (
        <article
          className={cn(
            "customer-menu-book-entry group relative overflow-hidden rounded-[26px] border border-[#e4c9aa]/85 bg-[#fffaf1]/96 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-34px_rgba(79,43,17,0.6)] sm:grid sm:grid-cols-[210px_minmax(0,1fr)]",
            outOfStock && "opacity-80"
          )}
        >
          {outOfStock ? (
            <div className="absolute right-3 top-3 z-10 rounded-full bg-[#c93d2d] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#fff6ef]">
              Tạm hết
            </div>
          ) : null}

          <div className="customer-menu-book-entry-plate relative min-h-[242px] overflow-hidden sm:min-h-full">
              {steamy ? (
                <>
                  <span className="customer-hotpot-steam absolute left-[18%] top-[2%] z-[1] scale-[0.68]" />
                  <span className="customer-hotpot-steam customer-hotpot-steam-delay-2 absolute right-[12%] top-[6%] z-[1] scale-[0.6]" />
                </>
              ) : null}

              {tapeLabel ? (
                <span className="absolute left-4 top-4 z-10 rounded-full border border-[#ead0a8]/85 bg-[#fff7e7]/94 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d6038] shadow-[0_12px_24px_-20px_rgba(77,44,18,0.45)]">
                  {tapeLabel}
                </span>
              ) : null}

              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.05]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#ead8b6_0%,#dcc295_100%)] px-6 text-center">
                  <div className="customer-mythmaker-title text-2xl font-semibold leading-tight text-[#573119]">
                    {item.name}
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.16)_100%)]" />
          </div>
            <div className="min-w-0 p-4 sm:p-5">
              {remain != null ? (
                <div className="mb-2 flex">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      outOfStock
                        ? "border-[#e4b6aa] bg-[#fff0eb] text-[#a34d41]"
                        : "border-[#bfd1a8] bg-[#eef7e5] text-[#5d7a34]"
                    )}
                  >
                    {outOfStock ? "Tạm hết" : `Còn ${remain}`}
                  </span>
                </div>
              ) : null}

              <h3 className="customer-mythmaker-title text-[2rem] font-semibold leading-[1.02] text-[#4b2817] sm:text-[2.35rem]">
                {item.name}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="text-[1.7rem] font-semibold leading-none text-[#c43c2d] sm:text-[1.9rem]">
                  {formatVnd(item.price)}
                </div>

                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="rounded-full border-[#e3c9a3] bg-[#fff8ee] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#855e3b]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <p className="customer-menu-book-note mt-3 text-sm leading-6 text-[#8a694f]">
                {servingNote}
              </p>

              <div ref={actionRef} className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] px-5 py-2.5 text-sm text-[#fff7f0] shadow-[0_16px_34px_-24px_rgba(94,26,16,0.9)] transition hover:brightness-110"
                  disabled={outOfStock || addCartItem.isPending}
                  onClick={() => handleAdd()}
                >
                  {primaryActionLabel}
                </Button>

                <button
                  type="button"
                  className="rounded-full border border-[#e0c49d]/80 bg-[#fff8ec] px-4 py-2.5 text-sm font-medium text-[#6a3b20] transition hover:bg-[#fff2df] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={outOfStock || addCartItem.isPending}
                  onClick={() => setShowCustomizer(true)}
                >
                  Tùy chọn
                </button>
              </div>
            </div>
        </article>
      ) : (
        <Card
          className={cn(
            "customer-hotpot-receipt group relative overflow-hidden rounded-[28px] border-none bg-transparent transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_80px_-46px_rgba(78,38,14,0.65)]",
            outOfStock && "opacity-80"
          )}
        >
          {tapeLabel ? (
            <div className="pointer-events-none absolute left-5 top-2 z-20">
              <span className="customer-hotpot-washi">{tapeLabel}</span>
            </div>
          ) : null}

          {outOfStock ? (
            <>
              <div className="pointer-events-none absolute inset-0 z-10 bg-[#fff6ef]/56 backdrop-blur-[1px]" />
              <div className="absolute right-4 top-4 z-20 rounded-full bg-[#c93d2d] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fff5ef] shadow">
                Tạm hết
              </div>
            </>
          ) : null}

          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#e9dcc2_0%,#dcc8a4_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.66),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(117,74,30,0.12))]" />
            <div className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fffdf9_0%,#f6f0e6_60%,#7c99b2_60%,#7c99b2_66%,#f9f4ea_66%,#e7dbc5_100%)] shadow-[0_24px_40px_-24px_rgba(78,45,20,0.9)]" />
            <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />

            {steamy ? (
              <>
                <span className="customer-hotpot-steam absolute left-[22%] top-[10%] scale-[0.8]" />
                <span className="customer-hotpot-steam customer-hotpot-steam-delay-2 absolute left-[38%] top-[4%] scale-[0.7]" />
                <span className="customer-hotpot-steam customer-hotpot-steam-delay-3 absolute right-[22%] top-[12%] scale-[0.72]" />
              </>
            ) : null}

            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="absolute left-1/2 top-1/2 z-[1] h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover shadow-[0_16px_30px_-16px_rgba(74,42,18,0.85)] transition duration-500 group-hover:scale-[1.05]"
              />
            ) : (
              <div className="absolute left-1/2 top-1/2 z-[1] flex h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffaf1] px-5 text-center shadow-[0_16px_30px_-16px_rgba(74,42,18,0.85)]">
                <div className="customer-mythmaker-title text-2xl font-semibold leading-tight text-[#573119]">
                  {item.name}
                </div>
              </div>
            )}
          </div>

          <CardHeader className="pb-2 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#9f7751]">
                  Phiếu gọi món
                </div>
                <h3 className="customer-mythmaker-title mt-1 text-3xl font-semibold leading-tight text-[#4b2817]">
                  {item.name}
                </h3>
              </div>

              <div className="rounded-full border border-[#dcc19d]/80 bg-[#fff9ef] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8e643f]">
                Quầy nóng
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pb-2">
            <div className="flex items-end justify-between gap-3">
              <p className="text-xl font-semibold text-[#c43c2d]">{formatVnd(item.price)}</p>
              {remain != null ? (
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    outOfStock
                      ? "border-[#e4b6aa] bg-[#fff0eb] text-[#a34d41]"
                      : "border-[#bfd1a8] bg-[#eef7e5] text-[#5d7a34]"
                  )}
                >
                  {outOfStock ? "Tạm hết" : `Còn ${remain}`}
                </span>
              ) : null}
            </div>

            <p className="text-sm leading-6 text-[#7b5a42]">{servingNote}</p>

            {item.tags && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-full border-[#e3c9a3] bg-[#fff8ee] px-2.5 py-1 text-[11px] text-[#855e3b]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="pb-5 pt-3">
            <div ref={actionRef} className="w-full space-y-2.5">
              <Button
                size="sm"
                className="w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] py-5 text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] transition hover:brightness-110"
                disabled={outOfStock || addCartItem.isPending}
                onClick={() => handleAdd()}
              >
                {primaryActionLabel}
              </Button>

              <button
                type="button"
                className="w-full rounded-full border border-[#e0c49d]/80 bg-[#fff8ec] px-4 py-3 text-sm font-medium text-[#6a3b20] transition hover:bg-[#fff2df] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={outOfStock || addCartItem.isPending}
                onClick={() => setShowCustomizer(true)}
              >
                Tùy chọn và ghi chú bếp
              </button>
            </div>
          </CardFooter>
        </Card>
      )}

      {flightTokens.map((token) => (
        <span
          key={token.id}
          className="customer-hotpot-flight-token"
          style={
            {
              "--flight-start-x": `${token.startX}px`,
              "--flight-start-y": `${token.startY}px`,
              "--flight-end-x": `${token.endX}px`,
              "--flight-end-y": `${token.endY}px`,
            } as CSSProperties
          }
        >
          <span className="customer-hotpot-flight-disc">
            {token.imageUrl ? (
              <img src={token.imageUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="customer-hotpot-flight-fallback">{token.label}</span>
            )}
            <span className="customer-hotpot-flight-splash" />
          </span>
        </span>
      ))}

      <CustomerMenuItemCustomizer
        key={`${item.id}:${showCustomizer ? "open" : "closed"}`}
        item={item}
        open={showCustomizer}
        pending={addCartItem.isPending}
        onClose={() => setShowCustomizer(false)}
        onConfirm={({ qty, itemOptions }) => handleAdd({ qty, itemOptions })}
      />
    </>
  );
}
