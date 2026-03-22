import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  fetchAttendanceBoard,
  type AttendanceBoardPayload,
  type AttendanceRole,
  type AttendanceShiftCode,
  type AttendanceStatus,
} from "../services/attendanceApi";

export function useAttendanceBoardQuery(input: {
  branchId: string | number | undefined;
  businessDate: string;
  shiftCode: AttendanceShiftCode;
  role?: AttendanceRole | null;
  status?: AttendanceStatus | null;
  q?: string | null;
  enabled: boolean;
}) {
  const branchId = input.branchId != null ? String(input.branchId).trim() : "";
  const businessDate = String(input.businessDate ?? "").trim();
  const shiftCode = input.shiftCode;
  const role = input.role ?? undefined;
  const status = input.status ?? undefined;
  const q = String(input.q ?? "").trim() || undefined;
  const queryKey = ["attendance", "board", { branchId, businessDate, shiftCode, role, status, q }] as const;

  return useAppQuery<AttendanceBoardPayload, AttendanceBoardPayload, readonly unknown[]>({
    queryKey,
    queryFn: () =>
      fetchAttendanceBoard({
        branchId,
        businessDate,
        shiftCode,
        role: role ?? null,
        status: status ?? null,
        q: q ?? null,
      }),
    enabled: input.enabled && branchId.length > 0 && businessDate.length > 0,
    staleTime: 3_000,
  });
}
