import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button, buttonVariants } from "../../../../shared/ui/button";
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
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";
import { cn } from "../../../../shared/utils/cn";

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

const CHECKIN_EARLY_MINUTES = 30;
const CHECKIN_LATE_MINUTES = 15;

function parseMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatRelativeMinutes(targetMs: number, nowMs = Date.now()) {
  const deltaMinutes = Math.round((targetMs - nowMs) / 60000);
  if (Math.abs(deltaMinutes) < 1) return "vừa xong";
  if (deltaMinutes > 0) return `còn ${deltaMinutes} phút`;
  return `trễ ${Math.abs(deltaMinutes)} phút`;
}

function describeCheckinWindow(row: PublicReservationRow, nowMs = Date.now()) {
  const fromMs = parseMs(row.reservedFrom);
  const toMs = parseMs(row.reservedTo);
  if (fromMs == null || toMs == null) return null;

  const opensAtMs = fromMs - CHECKIN_EARLY_MINUTES * 60_000;
  const closesAtMs = toMs + CHECKIN_LATE_MINUTES * 60_000;

  let tone: "default" | "positive" | "warn" | "danger" = "default";
  let label = "Chưa đến cửa sổ check-in";
  let detail = `Có thể check-in từ ${formatDateTime(new Date(opensAtMs).toISOString())}.`;

  if (row.status === "CHECKED_IN" || row.status === "COMPLETED") {
    tone = "positive";
    label = "Đã check-in";
    detail = row.checkedInAt
      ? `Khách đã check-in lúc ${formatDateTime(row.checkedInAt)}.`
      : "Nhân viên đã mở phiên phục vụ cho reservation này.";
  } else if (row.status === "CANCELED" || row.status === "EXPIRED" || row.status === "NO_SHOW") {
    tone = "danger";
    label = "Reservation không còn hiệu lực";
    detail = "Reservation này không còn nằm trong cửa sổ check-in hợp lệ.";
  } else if (nowMs < opensAtMs) {
    tone = "warn";
    detail = `Quầy sẽ cho check-in từ ${formatDateTime(new Date(opensAtMs).toISOString())} (${formatRelativeMinutes(opensAtMs, nowMs)}).`;
  } else if (nowMs <= closesAtMs) {
    tone = "positive";
    label = "Đang trong cửa sổ check-in";
    detail = `Có thể check-in đến ${formatDateTime(new Date(closesAtMs).toISOString())} (${formatRelativeMinutes(closesAtMs, nowMs)}).`;
  } else {
    tone = "danger";
    label = "Đã quá cửa sổ check-in";
    detail = "Nếu nhân viên chưa check-in kịp, reservation có thể sớm chuyển sang no-show.";
  }

  return {
    opensAtLabel: formatDateTime(new Date(opensAtMs).toISOString()),
    closesAtLabel: formatDateTime(new Date(closesAtMs).toISOString()),
    tone,
    label,
    detail,
  };
}

function describeHoldWindow(row: PublicReservationRow, nowMs = Date.now()) {
  const expiresAtMs = parseMs(row.expiresAt);
  if (expiresAtMs == null) return null;

  if (row.status === "PENDING") {
    const active = nowMs <= expiresAtMs;
    return {
      tone: active ? ("warn" as const) : ("danger" as const),
      label: active ? "Đang giữ bàn chờ xác nhận" : "Hết thời gian giữ bàn",
      detail: active
        ? `Bàn sẽ được giữ đến ${formatDateTime(row.expiresAt)} (${formatRelativeMinutes(expiresAtMs, nowMs)}).`
        : `Reservation đã vượt quá thời điểm giữ bàn ${formatDateTime(row.expiresAt)}.`,
    };
  }

  if (row.status === "CONFIRMED") {
    return {
      tone: "positive" as const,
      label: "Đã xác nhận giữ bàn",
      detail: "Bàn đã được quán xác nhận. Hãy đến trong cửa sổ check-in để nhân viên mở phiên phục vụ.",
    };
  }

  return null;
}

function statusTone(status: PublicReservationStatus): "default" | "positive" | "warn" | "danger" {
  switch (status) {
    case "CONFIRMED":
    case "CHECKED_IN":
    case "COMPLETED":
      return "positive";
    case "PENDING":
      return "warn";
    case "CANCELED":
    case "EXPIRED":
    case "NO_SHOW":
      return "danger";
    default:
      return "default";
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
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <div className="space-y-6">
          <Skeleton className="customer-hotpot-receipt h-32 w-full rounded-[30px]" />
          <Skeleton className="customer-hotpot-receipt h-64 w-full rounded-[30px]" />
        </div>
      </CustomerHotpotShell>
    );
  }

  if (query.error) {
    return (
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <div className="space-y-5">
          <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
            <AlertDescription>{getReservationErrorMessage(query.error)}</AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => query.refetch()}
              className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
            >
              Thử lại
            </Button>
            <Link
              to="/c/reservations"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
              )}
            >
              Tạo reservation khác
            </Link>
          </div>
        </div>
      </CustomerHotpotShell>
    );
  }

  const row = query.data;
  if (!row) {
    return (
      <CustomerHotpotShell contentClassName="max-w-5xl">
        <div className="space-y-5">
          <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
            <AlertDescription>Không tìm thấy reservation.</AlertDescription>
          </Alert>
          <Link
            to="/c/reservations"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
            )}
          >
            Quay lại đặt bàn
          </Link>
        </div>
      </CustomerHotpotShell>
    );
  }

  const checkinWindow = describeCheckinWindow(row);
  const holdWindow = describeHoldWindow(row);

  return (
    <CustomerHotpotShell contentClassName="max-w-5xl">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="customer-hotpot-kicker">Chi tiết reservation</div>
            <h1 className="customer-mythmaker-title customer-hotpot-page-title">Giữ chỗ của bạn tại quán</h1>
            <p className="customer-hotpot-page-subtitle">
              Theo dõi trạng thái reservation và hủy nếu kế hoạch thay đổi.
            </p>
          </div>

          <span className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold" data-tone={statusTone(row.status)}>
            {row.status}
          </span>
        </section>

        {flash ? (
          <Alert
            variant={flash.kind === "error" ? "destructive" : "default"}
            className={flash.kind === "success" ? "rounded-[20px] border-[#bfd1a8] bg-[#eef7e5]" : "rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]"}
          >
            <AlertDescription>{flash.message}</AlertDescription>
          </Alert>
        ) : null}

        <section className="customer-hotpot-receipt rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="customer-hotpot-kicker">Mã reservation</div>
              <div className="font-mono text-xl font-semibold text-[#5a301a]">{row.reservationCode}</div>
              <p className="text-sm text-[#7a5a43]">Lưu mã này để tra cứu khi cần.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="customer-hotpot-stat rounded-[24px] px-5 py-5">
              <div className="text-sm font-medium text-[#4e2916]">Thông tin đặt bàn</div>
              <div className="mt-4 grid gap-3 text-sm text-[#7a5a43]">
                <div className="flex items-center justify-between gap-3">
                  <span>Khu vực</span>
                  <span className="font-medium text-[#5a301a]">{row.areaName ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Bàn</span>
                  <span className="font-mono font-semibold text-[#5a301a]">{row.tableCode ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Số lượng khách</span>
                  <span className="font-medium text-[#5a301a]">{row.partySize}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Bắt đầu</span>
                  <span className="font-medium text-[#5a301a]">{formatDateTime(row.reservedFrom)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Kết thúc</span>
                  <span className="font-medium text-[#5a301a]">{formatDateTime(row.reservedTo)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Hết hạn giữ bàn</span>
                  <span className="font-medium text-[#5a301a]">{formatDateTime(row.expiresAt)}</span>
                </div>
              </div>
            </div>

            <div className="customer-hotpot-stat rounded-[24px] px-5 py-5">
              <div className="text-sm font-medium text-[#4e2916]">Thông tin liên hệ</div>
              <div className="mt-4 grid gap-3 text-sm text-[#7a5a43]">
                <div className="flex items-center justify-between gap-3">
                  <span>Tên liên hệ</span>
                  <span className="font-medium text-[#5a301a]">{row.contactName ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Số điện thoại</span>
                  <span className="font-medium text-[#5a301a]">{row.contactPhone ?? "—"}</span>
                </div>
                <div className="space-y-2">
                  <div>Ghi chú</div>
                  <div className="rounded-[18px] border border-[#dcc19d]/80 bg-[#fff8ec] p-3 text-[#5a301a]">
                    {row.note?.trim() || "Không có ghi chú."}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Tạo lúc</span>
                  <span className="font-medium text-[#5a301a]">{formatDateTime(row.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Cập nhật lúc</span>
                  <span className="font-medium text-[#5a301a]">{formatDateTime(row.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="customer-hotpot-stat rounded-[24px] px-5 py-4 text-sm text-[#7a5a43]">
          {getReservationStatusHint(row)}
        </div>

        {(holdWindow || checkinWindow) ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {holdWindow ? (
              <div className="customer-hotpot-stat rounded-[24px] px-5 py-4">
                <div className="customer-hotpot-kicker">Trạng thái giữ bàn</div>
                <div className="mt-2">
                  <span
                    className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold"
                    data-tone={holdWindow.tone}
                  >
                    {holdWindow.label}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#7a5a43]">{holdWindow.detail}</p>
              </div>
            ) : null}

            {checkinWindow ? (
              <div className="customer-hotpot-stat rounded-[24px] px-5 py-4">
                <div className="customer-hotpot-kicker">Cửa sổ check-in</div>
                <div className="mt-2">
                  <span
                    className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold"
                    data-tone={checkinWindow.tone}
                  >
                    {checkinWindow.label}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#7a5a43]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Mở từ</span>
                    <span className="font-medium text-[#5a301a]">{checkinWindow.opensAtLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Đóng lúc</span>
                    <span className="font-medium text-[#5a301a]">{checkinWindow.closesAtLabel}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#7a5a43]">{checkinWindow.detail}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {canCancelReservation(row) ? (
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={cancelMutation.isPending}
              className="rounded-full"
            >
              {cancelMutation.isPending ? "Đang hủy..." : "Hủy reservation"}
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => query.refetch()}
            className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
          >
            Làm mới
          </Button>

          <Link
            to="/c/reservations"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
            )}
          >
            Tạo reservation mới
          </Link>

          {["EXPIRED", "CANCELED", "NO_SHOW"].includes(row.status) ? (
            <Link
              to="/c/reservations"
              className={cn(
                buttonVariants({ variant: "default" }),
                "rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110",
              )}
            >
              Đặt reservation mới
            </Link>
          ) : null}
        </div>
      </div>
    </CustomerHotpotShell>
  );
}
