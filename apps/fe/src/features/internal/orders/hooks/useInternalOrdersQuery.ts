import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchInternalOrders, type InternalOrderRow } from "../services/ordersApi";

const STALE_MS = 2_000;

export function useInternalOrdersQuery(input: {
  branchId: string | number | undefined;
  enabled: boolean;
  statuses?: string[];
  q?: string;
  limit?: number;
}) {
  const branchId = input.branchId != null ? String(input.branchId).trim() : "";
  const statuses = (input.statuses ?? []).map((value) => String(value).trim().toUpperCase()).filter(Boolean);
  const q = String(input.q ?? "").trim();
  const limit = Number(input.limit ?? 120);

  return useAppQuery<InternalOrderRow[], InternalOrderRow[], readonly unknown[]>({
    queryKey: qk.orders.list({ branchId, statuses, q, limit }),
    queryFn: () => fetchInternalOrders({ branchId, statuses, q, limit }),
    enabled: input.enabled && branchId.length > 0,
    staleTime: STALE_MS,
  });
}
