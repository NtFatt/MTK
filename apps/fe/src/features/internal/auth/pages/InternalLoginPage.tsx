import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { authStore } from "../../../../shared/auth/authStore";
import { adminLogin } from "../../../../shared/auth/authApi";
import type { AuthSession } from "../../../../shared/auth/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Label } from "../../../../shared/ui/label";
import { Input } from "../../../../shared/ui/input";
import { Button } from "../../../../shared/ui/button";
import { isHttpError } from "../../../../shared/http/errors";

export function InternalLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onSuccess = useCallback(
    (session: AuthSession) => {
      authStore.getState().setSession(session);
      if (session.branchId != null) navigate(`/i/${session.branchId}/tables`, { replace: true });
      else navigate("/i/admin/system", { replace: true });
    },
    [navigate]
  );

const loginMutation = useAppMutation({
  mutationFn: async () => adminLogin({ username: username.trim(), password }),
onSuccess: (session) => {
  authStore.getState().setSession(session);

  const bid = session.branchId ?? (session.role === "ADMIN" ? "1" : undefined);

  if (bid) navigate(`/i/${bid}/tables`, { replace: true });
  else navigate("/i/login?reason=missing_branch", { replace: true });
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