import { useState, useEffect } from "react";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import type { HttpError } from "../../../../shared/http/errors";

type Props = {
  phone: string;
  onSubmit: (otp: string) => Promise<void>;
  error: HttpError | null;
  isLoading: boolean;
  /** Seconds to disable submit (e.g. 429 retryAfter). */
  cooldownSeconds?: number;
};

export function OtpVerifyForm({
  phone,
  onSubmit,
  error,
  isLoading,
  cooldownSeconds = 0,
}: Props) {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(cooldownSeconds);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setTimeout(() => setCooldown(cooldownSeconds), 0);
    return () => clearTimeout(id);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    onSubmit(otp.trim());
  };

  const disabled = isLoading || cooldown > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error != null && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Mã OTP đã gửi tới <strong>{phone}</strong>
      </p>
      <div className="space-y-2">
        <Label htmlFor="otp-verify-code">Mã OTP</Label>
        <Input
          id="otp-verify-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Nhập mã 6 số"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={disabled}
          maxLength={6}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={disabled}>
        {isLoading
          ? "Đang xác thực..."
          : cooldown > 0
            ? `Thử lại sau ${cooldown}s`
            : "Xác thực"}
      </Button>
    </form>
  );
}
