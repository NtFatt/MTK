import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { qk } from "@hadilao/contracts";
import { getOrCreateCart } from "../services/cartApi";
import type { Cart } from "../types";

const STALE_MS = 10 * 1000;

export function useCartQuery(sessionKey: string | null) {
  return useAppQuery<Cart, Cart, ReturnType<typeof qk.cart.bySessionKey>>({
    queryKey: qk.cart.bySessionKey(sessionKey ?? ""),
    queryFn: () => getOrCreateCart(sessionKey!),
    enabled: !!sessionKey,
    staleTime: STALE_MS,
  });
}
