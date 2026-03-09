import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";
import { authStore } from "./authStore";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (s) => s.session);

  const role = String(session?.role ?? "").toUpperCase();
  if (role !== "ADMIN") {
    return <Navigate to={`/i/${branchId ?? ""}/tables`} replace />;
  }

  return <>{children}</>;
}