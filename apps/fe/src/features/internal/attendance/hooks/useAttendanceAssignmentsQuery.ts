import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  fetchAttendanceAssignments,
  type AttendanceAssignmentsPayload,
  type AttendanceRole,
} from "../services/attendanceApi";

export function useAttendanceAssignmentsQuery(input: {
  branchId: string | number | undefined;
  businessDate: string;
  role?: AttendanceRole | null;
  q?: string | null;
  enabled: boolean;
}) {
  const branchId = input.branchId != null ? String(input.branchId).trim() : "";
  const businessDate = String(input.businessDate ?? "").trim();
  const role = input.role ?? undefined;
  const q = String(input.q ?? "").trim() || undefined;
  const queryKey = ["attendance", "assignments", { branchId, businessDate, role, q }] as const;

  return useAppQuery<AttendanceAssignmentsPayload, AttendanceAssignmentsPayload, readonly unknown[]>({
    queryKey,
    queryFn: () =>
      fetchAttendanceAssignments({
        branchId,
        businessDate,
        role: role ?? null,
        q: q ?? null,
      }),
    enabled: input.enabled && branchId.length > 0 && businessDate.length > 0,
    staleTime: 3_000,
  });
}
