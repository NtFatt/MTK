import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchDashboardOverview, type DashboardOverview } from "../services/dashboardApi";

const REFRESH_MS = 15_000;

export function useDashboardOverviewQuery(branchId: string | number | null, enabled: boolean) {
  const resolvedBranchId = branchId != null ? String(branchId).trim() : "";

  return useAppQuery<DashboardOverview, DashboardOverview, ReturnType<typeof qk.dashboard.overview>>({
    queryKey: qk.dashboard.overview({ branchId: resolvedBranchId }),
    queryFn: () => fetchDashboardOverview(resolvedBranchId),
    enabled: enabled && resolvedBranchId.length > 0,
    staleTime: 5_000,
    refetchInterval: enabled && resolvedBranchId.length > 0 ? REFRESH_MS : false,
    refetchIntervalInBackground: true,
  });
}
