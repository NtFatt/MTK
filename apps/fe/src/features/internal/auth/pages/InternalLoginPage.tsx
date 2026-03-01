import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { authStore } from "../../../../shared/auth/authStore";
import { adminLogin } from "../../../../shared/auth/authApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Label } from "../../../../shared/ui/label";
import { Input } from "../../../../shared/ui/input";
import { Button } from "../../../../shared/ui/button";
import { isHttpError } from "../../../../shared/http/errors";

export function InternalLoginPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const next = sp.get("next");
  const safeNext = next && next.startsWith("/i/") ? next : null;

  const loginMutation = useAppMutation({
    mutationFn: async () => adminLogin({ username: username.trim(), password }),
    onSuccess: (session) => {
      authStore.getState().setSession(session);

      if (safeNext) {
        navigate(safeNext, { replace: true });
        return;
      }

      const role = String(session.role ?? "").toUpperCase();

      // ✅ admin có thể không có branchId -> fallback mặc định
      const rawBid = session.branchId;
      const bid =
        rawBid != null && String(rawBid).trim()
          ? String(rawBid).trim()
          : role === "ADMIN"
            ? "1"
            : "";

      if (!bid) {
        navigate("/i/login?reason=missing_branch", { replace: true });
        return;
      }

      navigate(`/i/${bid}`, { replace: true });
    },
  });

  const err = loginMutation.error;
  const errMsg = isHttpError(err) ? err.message : err ? "Đăng nhập thất bại" : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Đăng nhập nội bộ</CardTitle>
          <CardDescription>Dùng tài khoản staff/admin (username/password)</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loginMutation.isPending}
              />
            </div>

            {errMsg && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {errMsg}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}