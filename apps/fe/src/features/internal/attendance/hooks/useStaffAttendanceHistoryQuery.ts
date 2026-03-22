import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { fetchStaffAttendanceHistory, type AttendanceRecord } from "../services/attendanceApi";

export function useStaffAttendanceHistoryQuery(input: {
  branchId: string | number | undefined;
  staffId: string | undefined;
  enabled: boolean;
  limit?: number;
}) {
  const branchId = input.branchId != null ? String(input.branchId).trim() : "";
  const staffId = String(input.staffId ?? "").trim();
  const limit = Math.max(1, Math.min(20, Number(input.limit ?? 8)));
  const queryKey = ["attendance", "staffHistory", { branchId, staffId, limit }] as const;

  return useAppQuery<AttendanceRecord[], AttendanceRecord[], readonly unknown[]>({
    queryKey,
    queryFn: () => fetchStaffAttendanceHistory({ branchId, staffId, limit }),
    enabled: input.enabled && branchId.length > 0 && staffId.length > 0,
    staleTime: 5_000,
  });
}
