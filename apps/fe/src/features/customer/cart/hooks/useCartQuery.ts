import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { qk } from "@hadilao/contracts";
import { getOrCreateCart } from "../services/cartApi";
import type { Cart } from "../types";
import { useCustomerSessionStore, selectBranchId } from "../../../../shared/customer/session/sessionStore";

const STALE_MS = 10 * 1000;

export function useCartQuery(sessionKey: string | null) {
  const branchId = useCustomerSessionStore(selectBranchId);

  return useAppQuery<Cart, Cart, ReturnType<typeof qk.cart.bySessionKey>>({
    queryKey: qk.cart.bySessionKey(sessionKey ?? ""),
    enabled: !!sessionKey && branchId != null,
    queryFn: () => getOrCreateCart(sessionKey!, branchId!),
    staleTime: STALE_MS,
  });
}