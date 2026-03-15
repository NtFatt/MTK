import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  checkinAdminReservation,
  type CheckinReservationResult,
} from "../services/reservationsApi";

export function useCheckinReservationMutation(branchId: string | number) {
  return useAppMutation<
    CheckinReservationResult,
    any,
    { reservationCode: string }
  >({
    invalidateKeys: [
      qk.reservations.list({ branchId }) as unknown as unknown[],
      qk.ops.tables.list({ branchId }) as unknown as unknown[],
    ],
    mutationFn: async ({ reservationCode }) => {
      return checkinAdminReservation(reservationCode);
    },
  });
}