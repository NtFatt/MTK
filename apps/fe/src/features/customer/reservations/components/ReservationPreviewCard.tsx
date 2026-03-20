import { CardContent } from "../../../../shared/ui/card";
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
    <div className="customer-hotpot-receipt rounded-[28px]">
      <CardContent className="grid gap-3 p-5 text-sm">
        <div className="space-y-1">
          <div className="customer-hotpot-kicker">Xem trước</div>
          <div className="customer-mythmaker-title text-3xl text-[#4e2916]">Tóm tắt reservation</div>
        </div>

        <div className="customer-hotpot-stat rounded-[22px] px-4 py-4 text-[#7a5a43]">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span>Khu vực</span>
              <span className="font-medium text-[#5a301a]">{areaName.trim() || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Số khách</span>
              <span className="font-medium text-[#5a301a]">{partySize}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Bắt đầu</span>
              <span className="font-medium text-[#5a301a]">{formatDateTime(reservedFromIso)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Kết thúc</span>
              <span className="font-medium text-[#5a301a]">{formatDateTime(reservedToIso)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Số điện thoại</span>
              <span className="font-medium text-[#5a301a]">{contactPhone.trim() || "—"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
