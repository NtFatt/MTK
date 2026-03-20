import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../../shared/ui/button";
import { CardContent } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";

export function ReservationLookupCard() {
  const navigate = useNavigate();
  const [reservationCode, setReservationCode] = useState("");

  const handleLookup = () => {
    const code = reservationCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/c/reservations/${encodeURIComponent(code)}`);
  };

  return (
    <div className="customer-hotpot-receipt rounded-[28px]">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <div className="customer-hotpot-kicker">Tra cứu reservation</div>
          <div className="customer-mythmaker-title text-3xl text-[#4e2916]">Đã đặt bàn trước đó?</div>
          <p className="text-sm text-[#7a5a43]">Nhập mã reservation để xem trạng thái hoặc hủy nếu còn hợp lệ.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservationLookupCode" className="text-[#6a4226]">Mã reservation</Label>
          <Input
            id="reservationLookupCode"
            value={reservationCode}
            onChange={(e) => setReservationCode(e.target.value)}
            placeholder="Ví dụ: RSV..."
            className="customer-hotpot-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLookup();
              }
            }}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
          onClick={handleLookup}
        >
          Tra cứu
        </Button>
      </CardContent>
    </div>
  );
}
