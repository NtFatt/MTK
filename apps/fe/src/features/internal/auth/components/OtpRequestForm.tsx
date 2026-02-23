import { useState } from "react";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import type { HttpError } from "../../../../shared/http/errors";

type Props = {
  onSubmit: (phone: string) => Promise<void>;
  error: HttpError | null;
  isLoading: boolean;
};

export function OtpRequestForm({ onSubmit, error, isLoading }: Props) {
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    onSubmit(phone.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error != null && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="otp-request-phone">Số điện thoại / Username</Label>
        <Input
          id="otp-request-phone"
          type="text"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Nhập số điện thoại hoặc username"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
      </Button>
    </form>
  );
}
