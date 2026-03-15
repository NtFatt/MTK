import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  confirmAdminReservation,
  type ReservationRow,
} from "../services/reservationsApi";

export function useConfirmReservationMutation(branchId: string | number) {
  return useAppMutation<ReservationRow, any, { reservationCode: string }>({
    invalidateKeys: [
      qk.reservations.list({ branchId }) as unknown as unknown[],
      qk.ops.tables.list({ branchId }) as unknown as unknown[],
    ],
    mutationFn: async ({ reservationCode }) => {
      return confirmAdminReservation(reservationCode);
    },
  });
}