import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { formatDateTime } from "../reservationForm";

type ReservationPreviewCardProps = {
  areaName: string;
  partySize: number;
  reservedFromIso: string | null;
  reservedToIso: string | null;
  contactPhone: string;
};

export function ReservationPreviewCard({
  areaName,
  partySize,
  reservedFromIso,
  reservedToIso,
  contactPhone,
}: ReservationPreviewCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Xem trước</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tóm tắt nhanh reservation trước khi gửi.
        </p>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Khu vực</span>
          <span className="font-medium">{areaName.trim() || "—"}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Số khách</span>
          <span className="font-medium">{partySize}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Bắt đầu</span>
          <span className="font-medium">{formatDateTime(reservedFromIso)}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Kết thúc</span>
          <span className="font-medium">{formatDateTime(reservedToIso)}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Số điện thoại</span>
          <span className="font-medium">{contactPhone.trim() || "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}