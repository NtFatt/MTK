import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";
import { authStore } from "../../../../shared/auth/authStore";

function resolveInternalHomePath(session: any, branchId: string) {
  const perms: string[] = session?.permissions ?? [];
  const role = String(session?.role ?? "").trim().toUpperCase();

  // ✅ ADMIN detect chắc chắn (role + admin-only perms)
  const isAdmin =
    role === "ADMIN" ||
    perms.includes("staff.manage") ||
    perms.includes("maintenance.run") ||
    perms.includes("observability.admin.read") ||
    perms.includes("realtime.admin") ||
    perms.includes("payments.mock_success");

  if (isAdmin) return `/i/${branchId}/admin`;

  if (perms.includes("cashier.unpaid.read") || role === "CASHIER") return `/i/${branchId}/cashier`;
  if (perms.includes("kitchen.queue.read") || role === "KITCHEN") return `/i/${branchId}/kitchen`;
  if (perms.includes("ops.tables.read") || role === "OPS") return `/i/${branchId}/tables`;

  return `/i/${branchId}/tables`;
}

export function InternalIndexRedirect() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();
  const bid = String(branchId ?? session?.branchId ?? "").trim();

  if (!session) return <Navigate to="/i/login" replace />;
  if (!bid) return <Navigate to="/i/login?reason=missing_branch" replace />;

  return <Navigate to={resolveInternalHomePath(session, bid)} replace />;
}