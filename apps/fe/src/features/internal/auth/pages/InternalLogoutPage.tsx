import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authStore } from "../../../../shared/auth/authStore";
import { onLogout } from "../../../../shared/http/refreshSingleFlight";

export function InternalLogoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    onLogout();
    authStore.getState().logout();
    queryClient.clear();
    navigate("/i/login", { replace: true });
  }, [navigate, queryClient]);

  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <p className="text-muted-foreground">Đang đăng xuất...</p>
    </div>
  );
}
