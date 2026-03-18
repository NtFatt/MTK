import { useAppQuery } from "../../../../shared/http/useAppQuery";
import {
  getReservationAvailability,
  type ReservationAvailabilityInput,
  type ReservationAvailabilityResult,
} from "../services/reservationsApi";

const FALLBACK_INPUT: ReservationAvailabilityInput = {
  areaName: "",
  partySize: 1,
  reservedFrom: "1970-01-01T00:00:00.000Z",
  reservedTo: "1970-01-01T01:00:00.000Z",
};

function reservationAvailabilityQueryKey(input: ReservationAvailabilityInput | null) {
  return [
    "public",
    "reservations",
    "availability",
    input?.areaName ?? "",
    input?.partySize ?? 0,
    input?.reservedFrom ?? "",
    input?.reservedTo ?? "",
  ] as const;
}

export function useReservationAvailabilityQuery(
  input: ReservationAvailabilityInput | null,
  enabled: boolean,
) {
  return useAppQuery<
    ReservationAvailabilityResult,
    ReservationAvailabilityResult,
    ReturnType<typeof reservationAvailabilityQueryKey>
  >({
    queryKey: reservationAvailabilityQueryKey(input),
    queryFn: () => getReservationAvailability(input ?? FALLBACK_INPUT),
    enabled: enabled && input !== null,
    staleTime: 10_000,
    retry: false,
  });
}