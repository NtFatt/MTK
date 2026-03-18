import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  createReservation,
  type CreateReservationInput,
  type PublicReservationRow,
} from "../services/reservationsApi";

export function useCreateReservationMutation() {
  return useAppMutation<PublicReservationRow, any, CreateReservationInput>({
    mutationFn: async (input) => createReservation(input),
  });
}