import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getReservationByCode,
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

export function useReservationQuery(
  reservationCode: string | null,
  enabled: boolean,
) {
  return useAppQuery<
    PublicReservationRow,
    PublicReservationRow,
    ReturnType<typeof reservationDetailQueryKey>
  >({
    queryKey: reservationDetailQueryKey(reservationCode),
    queryFn: () => getReservationByCode(String(reservationCode)),
    enabled: enabled && !!reservationCode,
    staleTime: 5_000,
    retry: false,
  });
}