import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  manualAttendanceCheckIn,
  manualAttendanceCheckOut,
  markAttendanceAbsent,
  replaceAttendanceAssignments,
  type AttendanceAssignmentsPayload,
  type AttendanceCheckInPayload,
  type AttendanceCheckOutPayload,
  type AttendanceMarkAbsentPayload,
  type AttendanceRecord,
  type AttendanceShiftCode,
  type ReplaceAttendanceAssignmentsPayload,
} from "../services/attendanceApi";

function buildIdempotencyKey(scope: string): string {
  return `${scope}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function useAttendanceMutations() {
  const queryClient = useQueryClient();

  const invalidateAttendance = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance", "board"] });
    queryClient.invalidateQueries({ queryKey: ["attendance", "assignments"] });
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

  const replaceAssignmentsMutation = useAppMutation<
    AttendanceAssignmentsPayload,
    any,
    { shiftCode: AttendanceShiftCode; payload: ReplaceAttendanceAssignmentsPayload }
  >({
    mutationFn: async ({ shiftCode, payload }) =>
      replaceAttendanceAssignments(
        shiftCode,
        payload,
        buildIdempotencyKey(`attendance-assignments:${shiftCode}`),
      ),
    onSuccess: invalidateAttendance,
  });

  return {
    checkInMutation,
    checkOutMutation,
    markAbsentMutation,
    replaceAssignmentsMutation,
  };
}
