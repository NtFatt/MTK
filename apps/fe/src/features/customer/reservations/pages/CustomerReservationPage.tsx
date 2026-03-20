import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";

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
    <CustomerHotpotShell contentClassName="max-w-6xl">
      <div className="space-y-6">
        <section className="space-y-2">
          <div className="customer-hotpot-kicker">Đặt bàn trước</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">Giữ chỗ cho bữa lẩu của bạn</h1>
          <p className="customer-hotpot-page-subtitle">
            Chọn khu vực, số lượng khách và khung giờ để hệ thống kiểm tra bàn trống rồi tạo
            reservation ngay trong app.
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

            <Link
              to="/c/menu"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
              )}
            >
              Quay lại thực đơn
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
    </CustomerHotpotShell>
  );
}
