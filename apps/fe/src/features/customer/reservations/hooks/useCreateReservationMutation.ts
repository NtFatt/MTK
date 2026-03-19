import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  createReservation,
  type CreateReservationInput,
  type PublicReservationRow,
} from "../services/reservationsApi";

export function useCreateReservationMutation() {
  const queryClient = useQueryClient();

  return useAppMutation<PublicReservationRow, unknown, CreateReservationInput>({
    mutationFn: async (input) => createReservation(input),
    invalidateKeys: [
      ["public", "reservations", "availability"],
      ["reservations", "list"],
    ],
    onSuccess: (row) => {
      queryClient.setQueryData(
        ["public", "reservations", "detail", row.reservationCode],
        row,
      );
    },
  });
}