import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import {
  hasAnyPermission,
  hasPermission,
  isInternalBranchMismatch,
  resolveInternalBranch,
} from "../../../../shared/auth/permissions";
import { useRealtimeRoom } from "../../../../shared/realtime/useRealtimeRoom";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Skeleton } from "../../../../shared/ui/skeleton";

import { useReservationsQuery } from "../hooks/useReservationsQuery";
import { useConfirmReservationMutation } from "../hooks/useConfirmReservationMutation";
import { useCheckinReservationMutation } from "../hooks/useCheckinReservationMutation";
import type { ReservationRow, ReservationStatus } from "../services/reservationsApi";

const STATUS_OPTIONS: Array<{ value: "" | ReservationStatus; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "PENDING" },
  { value: "CONFIRMED", label: "CONFIRMED" },
  { value: "CHECKED_IN", label: "CHECKED_IN" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "NO_SHOW", label: "NO_SHOW" },
  { value: "CANCELED", label: "CANCELED" },
  { value: "EXPIRED", label: "EXPIRED" },
];

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("vi-VN");
}

function statusVariant(
  status: ReservationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "CONFIRMED":
    case "CHECKED_IN":
    case "COMPLETED":
      return "default";
    case "PENDING":
      return "secondary";
    case "CANCELED":
    case "EXPIRED":
    case "NO_SHOW":
      return "destructive";
    default:
      return "outline";
  }
}

function canConfirmRow(row: ReservationRow) {
  return row.status === "PENDING";
}

function canCheckinRow(row: ReservationRow) {
  return row.status === "CONFIRMED";
}

function extractErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Thao tác thất bại.";
}

export function InternalReservationsPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const bid = resolveInternalBranch(session, branchId);
  const branchMismatch = isInternalBranchMismatch(session, branchId);

  const canSeePage = hasAnyPermission(session, [
    "reservations.confirm",
    "reservations.checkin",
  ]);

  const canConfirm = hasPermission(session, "reservations.confirm");
  const canCheckin = hasPermission(session, "reservations.checkin");

  const [status, setStatus] = useState<"" | ReservationStatus>("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(50);
  const [flash, setFlash] = useState<FlashState>(null);

  const enabled = !!session && !!bid && !branchMismatch && canSeePage;

  useRealtimeRoom(bid ? `branch:${bid}` : null, enabled);

  const { data, isLoading, isFetching, error, refetch } = useReservationsQuery(
    {
      branchId: bid,
      status,
      phone,
      from,
      to,
      limit,
    },
    enabled,
  );

  useEffect(() => {
    if (!enabled) return;

    const handler: EventListener = () => {
      void refetch();
    };

    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch]);

  const confirmMut = useConfirmReservationMutation(bid);
  const checkinMut = useCheckinReservationMutation(bid);

  const rows = useMemo(() => data ?? [], [data]);
  const queryErrorMessage = error ? extractErrorMessage(error) : null;

  if (!session) {
    return <Navigate to="/i/login" replace />;
  }

  if (!bid) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  if (branchMismatch) {
    return <Navigate to={`/i/${String(session.branchId)}/reservations`} replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Can
        anyOf={["reservations.confirm", "reservations.checkin"]}
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền truy cập Reservations.
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Reservations</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {flash && (
              <Alert
                className={
                  flash.kind === "error"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : undefined
                }
              >
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>{flash.message}</span>
                  <Button variant="secondary" type="button" onClick={() => setFlash(null)}>
                    Ẩn
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <form
              className="grid gap-4 md:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault();
                setFlash(null);
                void refetch();
              }}
            >
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "" | ReservationStatus)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="090..."
                />
              </div>

              <div className="space-y-2">
                <Label>Từ</Label>
                <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Đến</Label>
                <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value || 50))}
                />
              </div>

              <div className="md:col-span-5 flex flex-wrap gap-2">
                <Button type="submit" disabled={!enabled || isFetching}>
                  {isFetching ? "Đang tải..." : "Lọc"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setStatus("");
                    setPhone("");
                    setFrom("");
                    setTo("");
                    setLimit(50);
                    setFlash(null);
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isFetching && !isLoading && (
          <div className="text-sm text-muted-foreground">Đang làm mới...</div>
        )}

        {isLoading && (
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {queryErrorMessage || "Không thể tải reservations."}
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Không có reservation phù hợp bộ lọc.
          </div>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <div className="grid gap-4">
            {rows.map((row) => {
              const confirming =
                confirmMut.isPending &&
                confirmMut.variables?.reservationCode === row.reservationCode;

              const checkingIn =
                checkinMut.isPending &&
                checkinMut.variables?.reservationCode === row.reservationCode;

              return (
                <Card key={row.reservationCode}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{row.reservationCode}</span>
                          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {row.contactName || "Khách chưa rõ tên"} · {row.contactPhone || "—"}
                        </div>
                      </div>

                      <div className="text-right text-sm text-muted-foreground">
                        <div>Bàn: {row.tableCode || "—"}</div>
                        <div>Khu: {row.areaName || "—"}</div>
                        <div>Số khách: {row.partySize || 0}</div>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Reserved from: </span>
                        <span>{formatDateTime(row.reservedFrom)}</span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">Reserved to: </span>
                        <span>{formatDateTime(row.reservedTo)}</span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">Confirmed at: </span>
                        <span>{formatDateTime(row.confirmedAt)}</span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">Checked-in at: </span>
                        <span>{formatDateTime(row.checkedInAt)}</span>
                      </div>
                    </div>

                    {row.note && (
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        {row.note}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Can perm="reservations.confirm">
                        <Button
                          type="button"
                          disabled={!canConfirm || !canConfirmRow(row) || confirming || checkingIn}
                          onClick={() => {
                            setFlash(null);
                            confirmMut.mutate(
                              { reservationCode: row.reservationCode },
                              {
                                onSuccess: () => {
                                  setFlash({
                                    kind: "success",
                                    message: `Đã confirm reservation ${row.reservationCode}.`,
                                  });
                                  void refetch();
                                },
                                onError: (mutationError) => {
                                  setFlash({
                                    kind: "error",
                                    message: extractErrorMessage(mutationError),
                                  });
                                },
                              },
                            );
                          }}
                        >
                          {confirming ? "Đang confirm..." : "Confirm"}
                        </Button>
                      </Can>

                      <Can perm="reservations.checkin">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!canCheckin || !canCheckinRow(row) || checkingIn || confirming}
                          onClick={() => {
                            setFlash(null);
                            checkinMut.mutate(
                              { reservationCode: row.reservationCode },
                              {
                                onSuccess: (out) => {
                                  const extra = out.sessionKey ? ` SessionKey: ${out.sessionKey}` : "";
                                  setFlash({
                                    kind: "success",
                                    message: `Đã check-in reservation ${row.reservationCode}.${extra}`,
                                  });
                                  void refetch();
                                },
                                onError: (mutationError) => {
                                  setFlash({
                                    kind: "error",
                                    message: extractErrorMessage(mutationError),
                                  });
                                },
                              },
                            );
                          }}
                        >
                          {checkingIn ? "Đang check-in..." : "Check-in"}
                        </Button>
                      </Can>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Can>
    </div>
  );
}