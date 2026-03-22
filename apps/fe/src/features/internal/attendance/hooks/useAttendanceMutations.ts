import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  manualAttendanceCheckIn,
  manualAttendanceCheckOut,
  markAttendanceAbsent,
  type AttendanceCheckInPayload,
  type AttendanceCheckOutPayload,
  type AttendanceMarkAbsentPayload,
  type AttendanceRecord,
} from "../services/attendanceApi";

function buildIdempotencyKey(scope: string): string {
  return `${scope}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function useAttendanceMutations() {
  const queryClient = useQueryClient();

  const invalidateAttendance = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance", "board"] });
    queryClient.invalidateQueries({ queryKey: ["attendance", "staffHistory"] });
  };

  const checkInMutation = useAppMutation<
    AttendanceRecord,
    any,
    { staffId: string; payload: AttendanceCheckInPayload }
  >({
    mutationFn: async ({ staffId, payload }) =>
      manualAttendanceCheckIn(staffId, payload, buildIdempotencyKey(`attendance-checkin:${staffId}`)),
    onSuccess: invalidateAttendance,
  });

  const checkOutMutation = useAppMutation<
    AttendanceRecord,
    any,
    { attendanceId: string; payload: AttendanceCheckOutPayload }
  >({
    mutationFn: async ({ attendanceId, payload }) =>
      manualAttendanceCheckOut(
        attendanceId,
        payload,
        buildIdempotencyKey(`attendance-checkout:${attendanceId}`),
      ),
    onSuccess: invalidateAttendance,
  });

  const markAbsentMutation = useAppMutation<
    AttendanceRecord,
    any,
    { staffId: string; payload: AttendanceMarkAbsentPayload }
  >({
    mutationFn: async ({ staffId, payload }) =>
      markAttendanceAbsent(staffId, payload, buildIdempotencyKey(`attendance-absent:${staffId}`)),
    onSuccess: invalidateAttendance,
  });

  return {
    checkInMutation,
    checkOutMutation,
    markAbsentMutation,
  };
}
