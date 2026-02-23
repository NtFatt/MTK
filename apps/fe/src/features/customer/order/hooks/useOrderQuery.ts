import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { qk } from "@hadilao/contracts";
import { getOrder } from "../services/orderApi";
import type { Order } from "../types";
import { isOrderTerminal } from "../types";

const STALE_MS = 3 * 1000;
const POLL_MS = 4000;

export function useOrderQuery(orderCode: string | undefined) {
  return useAppQuery<Order, Order, ReturnType<typeof qk.orders.byCode>>({
    queryKey: qk.orders.byCode(orderCode ?? ""),
    queryFn: () => getOrder(orderCode!),
    enabled: !!orderCode,
    staleTime: STALE_MS,
    refetchInterval: (query) => {
      if (!orderCode) return false;
      const data = query.state.data as Order | undefined;
      if (isOrderTerminal(data?.status)) return false;
      return POLL_MS;
    },
  });
}
