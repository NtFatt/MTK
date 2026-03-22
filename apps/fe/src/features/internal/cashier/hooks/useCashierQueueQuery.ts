import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchCashierQueue, type CashierOrderRow } from "../services/cashierQueueApi";

const STALE_MS = 2500;
const REFRESH_MS = 10000;

export function useCashierQueueQuery(input: {
  branchId: string | number | undefined;
  enabled: boolean;
  limit?: number;
}) {
  const branchId = input.branchId != null ? String(input.branchId).trim() : "";
  const limit = Number(input.limit ?? 50);

  return useAppQuery<CashierOrderRow[], CashierOrderRow[], readonly unknown[]>({
    queryKey: qk.orders.cashierUnpaid({ branchId }),
    queryFn: () => fetchCashierQueue({ branchId, limit }),
    enabled: input.enabled && branchId.length > 0,
    staleTime: STALE_MS,
    refetchInterval: input.enabled && branchId.length > 0 ? REFRESH_MS : false,
    refetchIntervalInBackground: true,
  });
}
