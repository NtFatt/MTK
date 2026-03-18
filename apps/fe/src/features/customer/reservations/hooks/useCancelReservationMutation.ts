import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  cancelReservationByCode,
  type PublicReservationRow,
} from "../services/reservationsApi";

function reservationDetailQueryKey(reservationCode: string | null) {
  return [
    "public",
    "reservations",
    "detail",
    reservationCode ?? "",
  ] as const;
}

export function useCancelReservationMutation(reservationCode: string | null) {
  return useAppMutation<PublicReservationRow, any, void>({
    mutationFn: async () => cancelReservationByCode(String(reservationCode)),
    invalidateKeys: reservationCode
      ? [[...reservationDetailQueryKey(reservationCode)]]
      : [],
  });
}