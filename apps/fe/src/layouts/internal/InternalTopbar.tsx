import { Badge } from "../../shared/ui/badge";
import { Button } from "../../shared/ui/button";
import { useStore } from "zustand";
import { authStore } from "../../shared/auth/authStore";
import { BranchSwitcher } from "./BranchSwitcher";

export function InternalTopbar({ branchId }: { branchId: string }) {
  const session = useStore(authStore, (s) => s.session);
  const role = String(session?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN";

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-xl font-semibold">Quản trị hệ thống</div>
          <div className="mt-1">
            <Badge variant="secondary">
              Đang quản lý: Chi nhánh {branchId || "—"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ✅ Admin mới thấy nút đổi chi nhánh */}
          {isAdmin && <BranchSwitcher branchId={branchId} />}

          {/* sau này thay bằng avatar menu */}
          <Button variant="outline">Logout</Button>
        </div>
      </div>
    </header>
  );
}