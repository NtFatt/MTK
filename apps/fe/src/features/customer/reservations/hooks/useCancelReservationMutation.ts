import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  cancelReservationByCode,
  type PublicReservationRow,
} from "../services/reservationsApi";

export function useCancelReservationMutation(reservationCode: string | null) {
  const queryClient = useQueryClient();

  return useAppMutation<PublicReservationRow, unknown, void>({
    mutationFn: async () => {
      const code = reservationCode?.trim().toUpperCase();
      if (!code) {
        throw new Error("Thiếu reservation code.");
      }
      return cancelReservationByCode(code);
    },
    invalidateKeys: [
      ["public", "reservations", "availability"],
      ["reservations", "list"],
      ...(reservationCode
        ? [["public", "reservations", "detail", reservationCode.trim().toUpperCase()]]
        : []),
    ],
    onSuccess: (row) => {
      queryClient.setQueryData(
        ["public", "reservations", "detail", row.reservationCode],
        row,
      );
    },
  });
}