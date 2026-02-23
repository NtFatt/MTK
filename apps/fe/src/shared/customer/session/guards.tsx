/**
 * Customer session guard — redirect to /c/qr if no session.
 * Do not mix with internal shared/auth guards.
 * Hydrate is run in app providers, not here.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "zustand";
import { customerSessionStore, selectHasSession } from "./sessionStore";

export function RequireCustomerSession({ children }: { children: ReactNode }) {
  const hydrated = useStore(customerSessionStore, (s) => s.isHydrated);
  const hasSession = useStore(customerSessionStore, selectHasSession);
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!hasSession) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/c/qr?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}
