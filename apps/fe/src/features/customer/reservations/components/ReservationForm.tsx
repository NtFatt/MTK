import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
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
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Thông tin reservation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Nhập đúng khu vực, thời gian và thông tin liên hệ để giữ bàn.
        </p>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="areaName">Khu vực</Label>
              <Input
                id="areaName"
                value={areaName}
                onChange={(e) => onAreaNameChange(e.target.value)}
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
                onChange={(e) => onPartySizeChange(Number(e.target.value || 1))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservedFrom">Thời gian bắt đầu</Label>
              <Input
                id="reservedFrom"
                type="datetime-local"
                value={reservedFromLocal}
                onChange={(e) => onReservedFromChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservedTo">Thời gian kết thúc</Label>
              <Input
                id="reservedTo"
                type="datetime-local"
                value={reservedToLocal}
                onChange={(e) => onReservedToChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Tên liên hệ</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => onContactNameChange(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Số điện thoại</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => onContactPhoneChange(e.target.value)}
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
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ví dụ: bàn yên tĩnh, có trẻ em, gần cửa sổ..."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo reservation..." : "Đặt bàn"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}