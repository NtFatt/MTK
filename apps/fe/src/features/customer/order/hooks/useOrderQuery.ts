import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { qk } from "@hadilao/contracts";
import { getOrder } from "../services/orderApi";
import type { Order } from "../types";
import { isOrderTerminal } from "../types";

const STALE_MS = 3 * 1000;
const POLL_MS = 4000;

const MISSING = "__missing_order__";

export function useOrderQuery(orderCode: string | undefined) {
  const key = qk.orders.byCode(orderCode ?? MISSING);

  return useAppQuery<Order, Order, ReturnType<typeof qk.orders.byCode>>({
    queryKey: key,
    queryFn: () => getOrder(orderCode!), // safe vì enabled
    enabled: !!orderCode,
    staleTime: STALE_MS,
    refetchInterval: (query) => {
      if (!orderCode) return false;
      const data = query.state.data as Order | undefined;
      return isOrderTerminal(data?.status) ? false : POLL_MS;
    },
  });
}