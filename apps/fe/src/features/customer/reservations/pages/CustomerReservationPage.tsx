import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { HttpError } from "../../../../shared/http/errors";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Skeleton } from "../../../../shared/ui/skeleton";

import { useReservationAvailabilityQuery } from "../hooks/useReservationAvailabilityQuery";
import { useCreateReservationMutation } from "../hooks/useCreateReservationMutation";

function toIsoOrNull(raw: string): string | null {
  if (!raw.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mm = pad(date.getMinutes());

  return `${y}-${m}-${d}T${h}:${mm}`;
}

function addMinutesLocal(raw: string, minutes: number): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + minutes);
  return toLocalDateTimeValue(d);
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("vi-VN");
}

function extractReservationErrorMessage(error: unknown) {
  const e = error as HttpError | null | undefined;
  const code = e?.code;

  const map: Record<string, string> = {
    INVALID_RESERVATION_TIME: "Khung giờ đặt bàn không hợp lệ.",
    RESERVATION_IN_PAST: "Không thể đặt bàn trong quá khứ.",
    RESERVATION_TOO_FAR: "Chỉ được đặt bàn trong khoảng thời gian cho phép.",
    PARTY_SIZE_INVALID: "Số lượng khách không hợp lệ.",
    PHONE_REQUIRED: "Vui lòng nhập số điện thoại liên hệ.",
    AREA_REQUIRED: "Vui lòng nhập khu vực.",
    INVALID_RESERVED_FROM: "Thời gian bắt đầu không hợp lệ.",
    INVALID_RESERVED_TO: "Thời gian kết thúc không hợp lệ.",
    NO_TABLE_AVAILABLE: "Hiện không còn bàn phù hợp cho khung giờ này.",
  };

  if (code && map[code]) return map[code];
  if (e?.message?.trim()) return e.message;
  return "Không thể xử lý reservation lúc này.";
}

export function CustomerReservationPage() {
  const navigate = useNavigate();

  const [areaName, setAreaName] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [reservedFromLocal, setReservedFromLocal] = useState("");
  const [reservedToLocal, setReservedToLocal] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateReservationMutation();

  useEffect(() => {
    if (!reservedFromLocal.trim()) return;

    if (!reservedToLocal.trim()) {
      setReservedToLocal(addMinutesLocal(reservedFromLocal, 90));
      return;
    }

    const fromTime = Date.parse(reservedFromLocal);
    const toTime = Date.parse(reservedToLocal);
    if (Number.isFinite(fromTime) && Number.isFinite(toTime) && toTime <= fromTime) {
      setReservedToLocal(addMinutesLocal(reservedFromLocal, 90));
    }
  }, [reservedFromLocal, reservedToLocal]);

  const reservedFromIso = useMemo(
    () => toIsoOrNull(reservedFromLocal),
    [reservedFromLocal],
  );

  const reservedToIso = useMemo(
    () => toIsoOrNull(reservedToLocal),
    [reservedToLocal],
  );

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

  const handleSubmit = async () => {
    setFormError(null);

    if (!areaName.trim()) {
      setFormError("Vui lòng nhập khu vực.");
      return;
    }

    if (!contactPhone.trim()) {
      setFormError("Vui lòng nhập số điện thoại liên hệ.");
      return;
    }

    if (!reservedFromIso || !reservedToIso) {
      setFormError("Vui lòng nhập đầy đủ thời gian đặt bàn.");
      return;
    }

    if (new Date(reservedToIso).getTime() <= new Date(reservedFromIso).getTime()) {
      setFormError("Khung giờ đặt bàn không hợp lệ.");
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
      setFormError(extractReservationErrorMessage(error));
    }
  };

  const availabilityMessage = availabilityQuery.error
    ? extractReservationErrorMessage(availabilityQuery.error)
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Đặt bàn</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Điền thông tin đặt bàn để hệ thống kiểm tra bàn trống và tạo reservation.
          Theo contract backend hiện tại, bạn đặt theo <span className="font-medium">khu vực</span>.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Thông tin reservation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Nhập đúng khu vực, thời gian và thông tin liên hệ để giữ bàn.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {(formError || createMutation.error) && (
              <Alert variant="destructive">
                <AlertDescription>
                  {formError ?? extractReservationErrorMessage(createMutation.error)}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="areaName">Khu vực</Label>
                <Input
                  id="areaName"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Ví dụ: Main Hall / VIP / Outdoor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partySize">Số lượng khách</Label>
                <Input
                  id="partySize"
                  type="number"
                  min={1}
                  max={50}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value || 1))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservedFrom">Thời gian bắt đầu</Label>
                <Input
                  id="reservedFrom"
                  type="datetime-local"
                  value={reservedFromLocal}
                  onChange={(e) => setReservedFromLocal(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservedTo">Thời gian kết thúc</Label>
                <Input
                  id="reservedTo"
                  type="datetime-local"
                  value={reservedToLocal}
                  onChange={(e) => setReservedToLocal(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Tên liên hệ</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Số điện thoại</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="090..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <textarea
                id="note"
                className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: bàn yên tĩnh, có trẻ em, gần cửa sổ..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Đang tạo reservation..." : "Đặt bàn"}
              </Button>

              <Link to="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Quay lại trang chủ
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Kiểm tra khả dụng</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hệ thống tự kiểm tra khi bạn nhập đủ khu vực, khung giờ và số lượng khách.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {!availabilityInput && (
                <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Hãy nhập đủ <span className="font-medium">khu vực</span>,{" "}
                  <span className="font-medium">thời gian</span> và{" "}
                  <span className="font-medium">số lượng khách</span> để kiểm tra.
                </div>
              )}

              {availabilityInput && availabilityQuery.isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )}

              {availabilityInput && availabilityMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{availabilityMessage}</AlertDescription>
                </Alert>
              )}

              {availabilityInput && !availabilityQuery.isLoading && !availabilityMessage && availabilityQuery.data && (
                <>
                  <div
                    className={
                      availabilityQuery.data.available
                        ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                        : "rounded-xl border border-destructive/40 bg-destructive/10 p-4"
                    }
                  >
                    <div className="text-sm font-medium">
                      {availabilityQuery.data.available
                        ? "Có bàn phù hợp cho khung giờ này"
                        : "Hiện không còn bàn phù hợp"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Số bàn khả dụng:{" "}
                      <span className="font-semibold text-foreground">
                        {availabilityQuery.data.availableCount}
                      </span>
                    </div>
                  </div>

                  {availabilityQuery.data.suggestedTable && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-sm font-medium">Bàn gợi ý</div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                        <div>
                          Mã bàn:{" "}
                          <span className="font-mono text-foreground">
                            {availabilityQuery.data.suggestedTable.tableCode}
                          </span>
                        </div>
                        <div>
                          Khu vực:{" "}
                          <span className="text-foreground">
                            {availabilityQuery.data.suggestedTable.areaName}
                          </span>
                        </div>
                        <div>
                          Số ghế:{" "}
                          <span className="text-foreground">
                            {availabilityQuery.data.suggestedTable.seats}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Xem trước</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Khu vực</span>
                <span className="font-medium">{areaName.trim() || "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Số lượng khách</span>
                <span className="font-medium">{partySize || 0}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Bắt đầu</span>
                <span className="font-medium">{reservedFromIso ? formatDateTime(reservedFromIso) : "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Kết thúc</span>
                <span className="font-medium">{reservedToIso ? formatDateTime(reservedToIso) : "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Số điện thoại</span>
                <span className="font-medium">{contactPhone.trim() || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}