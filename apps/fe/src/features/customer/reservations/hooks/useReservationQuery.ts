import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getReservationByCode,
  type PublicReservationRow,
  type PublicReservationStatus,
} from "../services/reservationsApi";

function reservationDetailQueryKey(reservationCode: string | null) {
  return ["public", "reservations", "detail", reservationCode ?? ""] as const;
}

function isTerminalReservationStatus(status: PublicReservationStatus | null | undefined) {
  return (
    status === "CANCELED" ||
    status === "EXPIRED" ||
    status === "CHECKED_IN" ||
    status === "NO_SHOW" ||
    status === "COMPLETED"
  );
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
    staleTime: 3_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isTerminalReservationStatus(status) ? false : 5_000;
    },
    refetchIntervalInBackground: false,
  });
}