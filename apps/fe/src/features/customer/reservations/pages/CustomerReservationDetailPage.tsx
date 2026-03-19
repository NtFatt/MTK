import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button, buttonVariants } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Skeleton } from "../../../../shared/ui/skeleton";

import { useCancelReservationMutation } from "../hooks/useCancelReservationMutation";
import { useReservationQuery } from "../hooks/useReservationQuery";
import { getReservationErrorMessage } from "../reservationErrorMap";
import { formatDateTime } from "../reservationForm";
import { useRealtimeRoom } from "../../../../shared/realtime";
import type {
  PublicReservationRow,
  PublicReservationStatus,
} from "../services/reservationsApi";

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

function statusVariant(
  status: PublicReservationStatus,
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

function canCancelReservation(row: PublicReservationRow) {
  return row.status === "PENDING" || row.status === "CONFIRMED";
}

function getReservationStatusHint(row: PublicReservationRow) {
  switch (row.status) {
    case "PENDING":
      return `Reservation đang chờ xác nhận. Bàn sẽ được giữ đến ${formatDateTime(row.expiresAt)}.`;
    case "CONFIRMED":
      return "Reservation đã được xác nhận. Bạn có thể đến sớm tối đa 30 phút trước giờ đặt.";
    case "CHECKED_IN":
      return "Khách đã check-in thành công.";
    case "COMPLETED":
      return "Reservation đã hoàn tất.";
    case "CANCELED":
      return "Reservation này đã bị hủy.";
    case "EXPIRED":
      return "Reservation này đã hết hạn giữ bàn.";
    case "NO_SHOW":
      return "Reservation này đã bị đánh dấu no-show.";
    default:
      return "Theo dõi trạng thái reservation tại đây.";
  }
}

export function CustomerReservationDetailPage() {
  const { reservationCode } = useParams<{ reservationCode: string }>();
  const [flash, setFlash] = useState<FlashState>(null);

  const code = useMemo(
    () => String(reservationCode ?? "").trim().toUpperCase(),
    [reservationCode],
  );

  useRealtimeRoom(
    code ? `reservation:${code}` : null,
    !!code,
    code
      ? {
        kind: "customer",
        userKey: `reservation:${code}`,
      }
      : undefined,
  );

  const query = useReservationQuery(code || null, !!code);
  const cancelMutation = useCancelReservationMutation(code || null);

  if (!code) {
    return <Navigate to="/c/reservations" replace />;
  }

  const handleCancel = async () => {
    setFlash(null);

    try {
      const updated = await cancelMutation.mutateAsync();
      setFlash({
        kind: "success",
        message: `Đã hủy reservation ${updated.reservationCode}.`,
      });
    } catch (error) {
      setFlash({
        kind: "error",
        message: getReservationErrorMessage(error),
      });
    }
  };

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Alert variant="destructive">
          <AlertDescription>{getReservationErrorMessage(query.error)}</AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => query.refetch()}>
            Thử lại
          </Button>
          <Link to="/c/reservations" className={buttonVariants({ variant: "outline" })}>
            Tạo reservation khác
          </Link>
        </div>
      </div>
    );
  }

  const row = query.data;
  if (!row) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Alert variant="destructive">
          <AlertDescription>Không tìm thấy reservation.</AlertDescription>
        </Alert>
        <Link to="/c/reservations" className={buttonVariants({ variant: "outline" })}>
          Quay lại đặt bàn
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Chi tiết reservation</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi trạng thái reservation và hủy nếu kế hoạch thay đổi.
        </p>
      </section>

      {flash && (
        <Alert
          variant={flash.kind === "error" ? "destructive" : "default"}
          className={flash.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10" : undefined}
        >
          <AlertDescription>{flash.message}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-mono">{row.reservationCode}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mã reservation của bạn. Hãy lưu lại để tra cứu khi cần.
            </p>
          </div>

          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
        </CardHeader>

        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Thông tin đặt bàn</div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Khu vực</span>
                <span className="font-medium">{row.areaName ?? "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Bàn</span>
                <span className="font-mono">{row.tableCode ?? "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Số lượng khách</span>
                <span className="font-medium">{row.partySize}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Bắt đầu</span>
                <span className="font-medium">{formatDateTime(row.reservedFrom)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Kết thúc</span>
                <span className="font-medium">{formatDateTime(row.reservedTo)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Hết hạn giữ bàn</span>
                <span className="font-medium">{formatDateTime(row.expiresAt)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Thông tin liên hệ</div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Tên liên hệ</span>
                <span className="font-medium">{row.contactName ?? "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Số điện thoại</span>
                <span className="font-medium">{row.contactPhone ?? "—"}</span>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Ghi chú</div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  {row.note?.trim() || "Không có ghi chú."}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Tạo lúc</span>
                <span className="font-medium">{formatDateTime(row.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Cập nhật lúc</span>
                <span className="font-medium">{formatDateTime(row.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {getReservationStatusHint(row)}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {canCancelReservation(row) && (
          <Button
            variant="destructive"
            onClick={() => void handleCancel()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Đang hủy..." : "Hủy reservation"}
          </Button>
        )}

        <Button variant="outline" onClick={() => query.refetch()}>
          Làm mới
        </Button>

        <Link to="/c/reservations" className={buttonVariants({ variant: "outline" })}>
          Tạo reservation mới
        </Link>

        {["EXPIRED", "CANCELED", "NO_SHOW"].includes(row.status) && (
          <Link to="/c/reservations" className={buttonVariants({ variant: "default" })}>
            Đặt reservation mới
          </Link>
        )}
      </div>
    </div>
  );
}