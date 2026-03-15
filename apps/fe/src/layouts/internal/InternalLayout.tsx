import { Outlet, useParams } from "react-router-dom";
import { useStore } from "zustand";
import { authStore } from "../../shared/auth/authStore";
import { InternalSidebar } from "./InternalSidebar";
import { InternalTopbar } from "./InternalTopbar";
import { isAdminSession } from "../../shared/auth/permissions";

export function InternalLayout() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (s) => s.session);
  const isAdmin = isAdminSession(session);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* ✅ chỉ ADMIN mới có sidebar */}
        {isAdmin && <InternalSidebar />}

        <div className="flex-1">
          <InternalTopbar branchId={branchId ?? ""} />
          <main className="px-6 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}