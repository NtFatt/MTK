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

      // ✅ ưu tiên quay lại route đang định vào (tables/kitchen/...)
      if (safeNext) {
        navigate(safeNext, { replace: true });
        return;
      }

      const role = String(session.role ?? "").toUpperCase();
      const bid = Number(session.branchId ?? 1);

      if (role === "ADMIN") {
        navigate(`/i/${bid}/admin`, { replace: true });
        return;
      }

      if (role === "KITCHEN") {
        navigate(`/i/${bid}/kitchen`, { replace: true });
        return;
      }

      // Nếu chưa có cashier page thì tạm về tables
      if (role === "CASHIER") {
        navigate(`/i/${bid}/cashiermm`, { replace: true });
        return;
      }

      // ADMIN / BRANCH_MANAGER / STAFF
      navigate(`/i/${bid}/tables`, { replace: true });
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