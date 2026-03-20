import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { CardContent } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";

type ReservationFormProps = {
  areaName: string;
  partySize: number;
  contactName: string;
  contactPhone: string;
  note: string;
  reservedFromLocal: string;
  reservedToLocal: string;
  onAreaNameChange: (value: string) => void;
  onPartySizeChange: (value: number) => void;
  onContactNameChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onReservedFromChange: (value: string) => void;
  onReservedToChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
};

export function ReservationForm({
  areaName,
  partySize,
  contactName,
  contactPhone,
  note,
  reservedFromLocal,
  reservedToLocal,
  onAreaNameChange,
  onPartySizeChange,
  onContactNameChange,
  onContactPhoneChange,
  onNoteChange,
  onReservedFromChange,
  onReservedToChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: ReservationFormProps) {
  return (
    <div className="customer-hotpot-receipt rounded-[30px]">
      <CardContent className="p-5 sm:p-6">
        <div className="space-y-2">
          <div className="customer-hotpot-kicker">Thông tin reservation</div>
          <h2 className="customer-mythmaker-title text-3xl text-[#4e2916]">Giữ bàn trước giờ cao điểm</h2>
          <p className="text-sm text-[#7a5a43]">
            Nhập đúng khu vực, thời gian và thông tin liên hệ để hệ thống giữ bàn cho bạn.
          </p>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {errorMessage ? (
            <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="areaName" className="text-[#6a4226]">Khu vực</Label>
              <Input
                id="areaName"
                value={areaName}
                onChange={(e) => onAreaNameChange(e.target.value)}
                placeholder="Ví dụ: Main Hall / VIP / Outdoor"
                className="customer-hotpot-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partySize" className="text-[#6a4226]">Số lượng khách</Label>
              <Input
                id="partySize"
                type="number"
                min={1}
                max={50}
                value={partySize}
                onChange={(e) => onPartySizeChange(Number(e.target.value || 1))}
                className="customer-hotpot-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservedFrom" className="text-[#6a4226]">Thời gian bắt đầu</Label>
              <Input
                id="reservedFrom"
                type="datetime-local"
                value={reservedFromLocal}
                onChange={(e) => onReservedFromChange(e.target.value)}
                className="customer-hotpot-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservedTo" className="text-[#6a4226]">Thời gian kết thúc</Label>
              <Input
                id="reservedTo"
                type="datetime-local"
                value={reservedToLocal}
                onChange={(e) => onReservedToChange(e.target.value)}
                className="customer-hotpot-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName" className="text-[#6a4226]">Tên liên hệ</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => onContactNameChange(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="customer-hotpot-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-[#6a4226]">Số điện thoại</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => onContactPhoneChange(e.target.value)}
                placeholder="090..."
                className="customer-hotpot-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-[#6a4226]">Ghi chú</Label>
            <textarea
              id="note"
              className="customer-hotpot-textarea px-4 py-3 text-sm placeholder:text-[#a68569]"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ví dụ: bàn yên tĩnh, có trẻ em, gần cửa sổ..."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
            >
              {isSubmitting ? "Đang tạo reservation..." : "Đặt bàn"}
            </Button>
          </div>
        </form>
      </CardContent>
    </div>
  );
}
