import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
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
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Tra cứu reservation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Nhập mã reservation để xem trạng thái hoặc hủy nếu còn hợp lệ.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="reservationLookupCode">Mã reservation</Label>
          <Input
            id="reservationLookupCode"
            value={reservationCode}
            onChange={(e) => setReservationCode(e.target.value)}
            placeholder="Ví dụ: RSV..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLookup();
              }
            }}
          />
        </div>

        <Button type="button" variant="outline" onClick={handleLookup}>
          Tra cứu
        </Button>
      </CardContent>
    </Card>
  );
}