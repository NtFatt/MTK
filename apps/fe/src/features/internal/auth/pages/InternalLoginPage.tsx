import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { authStore } from "../../../../shared/auth/authStore";
import { requestOtp, verifyOtp } from "../../../../shared/auth/authApi";
import type { AuthSession } from "../../../../shared/auth/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { OtpRequestForm } from "../components/OtpRequestForm";
import { OtpVerifyForm } from "../components/OtpVerifyForm";
import { isHttpError } from "../../../../shared/http/errors";

function getRetryAfterSeconds(err: unknown): number | undefined {
  if (!isHttpError(err)) return undefined;
  const details = err.details as { retryAfter?: number } | undefined;
  return details?.retryAfter;
}

export function InternalLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const onSuccess = useCallback(
    (session: AuthSession) => {
      authStore.getState().setSession(session);
      if (session.branchId != null) {
        navigate(`/i/${session.branchId}/tables`, { replace: true });
      } else {
        navigate("/i/admin/system", { replace: true });
      }
    },
    [navigate]
  );

  const requestMutation = useAppMutation({
    mutationFn: async (p: string) => {
      await requestOtp({ phone: p });
      return p;
    },
    onSuccess: (p) => setPhone(p ?? null),
  });

  const verifyMutation = useAppMutation({
    mutationFn: async (otp: string) => {
      if (!phone) throw new Error("Missing phone");
      return verifyOtp({ phone, otp });
    },
    onSuccess: onSuccess,
    onError: (err) => {
      const retry = getRetryAfterSeconds(err);
      if (retry != null && retry > 0) setCooldown(retry);
      else if ((err as { status?: number }).status === 429) setCooldown(30);
    },
  });

  const handleRequestOtp = async (p: string) => {
    await requestMutation.mutateAsync(p);
  };

  const handleVerifyOtp = async (otp: string) => {
    await verifyMutation.mutateAsync(otp);
  };

  const requestError = requestMutation.error;
  const verifyError = verifyMutation.error;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Đăng nhập nội bộ</CardTitle>
          <CardDescription>Nhập số điện thoại để nhận mã OTP</CardDescription>
        </CardHeader>
        <CardContent>
          {phone == null ? (
            <OtpRequestForm
              onSubmit={handleRequestOtp}
              error={requestError}
              isLoading={requestMutation.isPending}
            />
          ) : (
            <OtpVerifyForm
              phone={phone}
              onSubmit={handleVerifyOtp}
              error={verifyError}
              isLoading={verifyMutation.isPending}
              cooldownSeconds={cooldown}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
