import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import {
  hasAnyPermission,
  hasPermission,
  isAdminSession,
  resolveInternalBranch,
} from "../../../../shared/auth/permissions";

function resolveInternalHomePath(session: any, branchId: string) {
  if (isAdminSession(session)) {
    return `/i/${branchId}/admin/dashboard`;
  }

  if (
    hasAnyPermission(session, [
      "inventory.read",
      "inventory.adjust",
      "inventory.holds.read",
    ])
  ) {
    return `/i/${branchId}/inventory/stock`;
  }

  if (hasPermission(session, "cashier.unpaid.read")) {
    return `/i/${branchId}/cashier`;
  }

  if (hasPermission(session, "kitchen.queue.read")) {
    return `/i/${branchId}/kitchen`;
  }

  if (hasPermission(session, "ops.tables.read")) {
    return `/i/${branchId}/tables`;
  }

  if (
    hasAnyPermission(session, [
      "reservations.confirm",
      "reservations.checkin",
    ])
  ) {
    return `/i/${branchId}/reservations`;
  }

  return `/i/${branchId}/tables`;
}

export function InternalIndexRedirect() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  if (!session) return <Navigate to="/i/login" replace />;

  const bid = resolveInternalBranch(session, branchId);

  if (!bid) return <Navigate to="/i/login?reason=missing_branch" replace />;

  return <Navigate to={resolveInternalHomePath(session, bid)} replace />;
}