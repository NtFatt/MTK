import { qk } from "@hadilao/contracts";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  listAdminReservations,
  type ListReservationsInput,
  type ReservationRow,
} from "../services/reservationsApi";

type ReservationsQueryKey = ReturnType<typeof qk.reservations.list>;

const STALE_MS = 5_000;

export function useReservationsQuery(
  input: ListReservationsInput,
  enabled: boolean,
) {
  return useAppQuery<ReservationRow[], ReservationRow[], ReservationsQueryKey>({
    queryKey: qk.reservations.list({
      branchId: input.branchId,
      status: input.status || undefined,
      q: input.phone?.trim() || undefined,
    }),
    queryFn: () => listAdminReservations(input),
    enabled,
    staleTime: STALE_MS,
  });
}