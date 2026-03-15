/**
 * Route and action guards: RequireAuth, Can.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "zustand";
import { authStore, selectIsAuthed } from "./authStore";

import { hasAnyPermission, hasPermission } from "./permissions";

function useIsHydrated(): boolean {
  return useStore(authStore, (s) => s.isHydrated);
}

function useIsAuthed(): boolean {
  return useStore(authStore, selectIsAuthed);
}

/** Require auth for /i/* (except /i/login). Shows loader until hydrated, then redirects to /i/login if not authed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const hydrated = useIsHydrated();
  const authed = useIsAuthed();
  const loc = useLocation();

  if (!hydrated) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!authed) {
    const next = encodeURIComponent(`${loc.pathname}${loc.search}`);
    return <Navigate to={`/i/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

type CanProps = {
  perm?: string;
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

/** Optional component: render children only if user has perm or any of anyOf. */
export function Can({ perm, anyOf, children, fallback = null }: CanProps) {
  const session = useStore(authStore, (s) => s.session);
  const allowed =
    (perm != null && hasPermission(session, perm)) ||
    (anyOf != null && anyOf.length > 0 && hasAnyPermission(session, anyOf));

  return allowed ? <>{children}</> : <>{fallback}</>;
}
