import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { buttonVariants } from "../../../../shared/ui/button";

import { useReservationAvailabilityQuery } from "../hooks/useReservationAvailabilityQuery";
import { useCreateReservationMutation } from "../hooks/useCreateReservationMutation";
import { ReservationAvailabilityCard } from "../components/ReservationAvailabilityCard";
import { ReservationForm } from "../components/ReservationForm";
import { ReservationLookupCard } from "../components/ReservationLookupCard";
import { ReservationPreviewCard } from "../components/ReservationPreviewCard";
import { getReservationErrorMessage } from "../reservationErrorMap";
import {
  createDefaultReservationWindow,
  toIsoOrNull,
  validateReservationForm,
  addMinutesLocal,
} from "../reservationForm";


export function CustomerReservationPage() {
  const navigate = useNavigate();

  const [areaName, setAreaName] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const defaults = createDefaultReservationWindow();

  const [reservedFromLocal, setReservedFromLocal] = useState(defaults.reservedFromLocal);
  const [reservedToLocal, setReservedToLocal] = useState(defaults.reservedToLocal);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateReservationMutation();

  const reservedFromIso = useMemo(() => toIsoOrNull(reservedFromLocal), [reservedFromLocal]);
  const reservedToIso = useMemo(() => toIsoOrNull(reservedToLocal), [reservedToLocal]);

  const availabilityInput = useMemo(() => {
    if (!areaName.trim()) return null;
    if (!reservedFromIso || !reservedToIso) return null;
    if (!Number.isFinite(partySize) || partySize < 1) return null;

    return {
      areaName: areaName.trim(),
      partySize,
      reservedFrom: reservedFromIso,
      reservedTo: reservedToIso,
    };
  }, [areaName, partySize, reservedFromIso, reservedToIso]);

  const availabilityQuery = useReservationAvailabilityQuery(
    availabilityInput,
    availabilityInput !== null,
  );

  const availabilityMessage = availabilityQuery.error
    ? getReservationErrorMessage(availabilityQuery.error)
    : null;

  const submitErrorMessage = formError ?? (
    createMutation.error ? getReservationErrorMessage(createMutation.error) : null
  );

  const handleSubmit = async () => {
    setFormError(null);

    const validationMessage = validateReservationForm({
      areaName,
      partySize,
      contactName,
      contactPhone,
      note,
      reservedFromLocal,
      reservedToLocal,
    });

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    if (!reservedFromIso || !reservedToIso) {
      setFormError("Vui lòng nhập đầy đủ thời gian đặt bàn.");
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        areaName: areaName.trim(),
        partySize,
        contactPhone: contactPhone.trim(),
        contactName: contactName.trim() || null,
        note: note.trim() || null,
        reservedFrom: reservedFromIso,
        reservedTo: reservedToIso,
      });

      navigate(`/c/reservations/${created.reservationCode}`);
    } catch (error) {
      setFormError(getReservationErrorMessage(error));
    }
  };
  function handleReservedFromChange(value: string) {
    setReservedFromLocal(value);

    if (!value.trim()) return;

    const fromTime = Date.parse(value);
    const toTime = Date.parse(reservedToLocal);

    if (!reservedToLocal.trim()) {
      setReservedToLocal(addMinutesLocal(value, 90));
      return;
    }

    if (Number.isFinite(fromTime) && Number.isFinite(toTime) && toTime <= fromTime) {
      setReservedToLocal(addMinutesLocal(value, 90));
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Đặt bàn</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Điền thông tin đặt bàn để hệ thống kiểm tra bàn trống và tạo reservation.
          Theo contract backend hiện tại, bạn đặt theo{" "}
          <span className="font-medium">khu vực</span>.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <ReservationForm
            areaName={areaName}
            partySize={partySize}
            contactName={contactName}
            contactPhone={contactPhone}
            note={note}
            reservedFromLocal={reservedFromLocal}
            reservedToLocal={reservedToLocal}
            onAreaNameChange={setAreaName}
            onPartySizeChange={setPartySize}
            onContactNameChange={setContactName}
            onContactPhoneChange={setContactPhone}
            onNoteChange={setNote}
            onReservedFromChange={handleReservedFromChange}
            onReservedToChange={setReservedToLocal}
            onSubmit={() => void handleSubmit()}
            isSubmitting={createMutation.isPending}
            errorMessage={submitErrorMessage}
          />

          <Link to="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Quay lại trang chọn chế độ
          </Link>
        </div>

        <div className="space-y-6">
          <ReservationAvailabilityCard
            inputReady={availabilityInput !== null}
            isLoading={availabilityQuery.isLoading || availabilityQuery.isFetching}
            errorMessage={availabilityMessage}
            data={availabilityQuery.data}
          />

          <ReservationPreviewCard
            areaName={areaName}
            partySize={partySize}
            reservedFromIso={reservedFromIso}
            reservedToIso={reservedToIso}
            contactPhone={contactPhone}
          />

          <ReservationLookupCard />
        </div>
      </div>
    </div>
  );
}