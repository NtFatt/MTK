/**
 * Single-flight refresh: multiple 401s trigger only one refresh call.
 */
import { refresh } from "../auth/authApi";
import type { AuthSession } from "../auth/types";

let refreshPromise: Promise<AuthSession | null> | null = null;

export function refreshOnce(): Promise<AuthSession | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refresh().then((session) => {
    refreshPromise = null;
    return session;
  });
  return refreshPromise;
}

export function clearRefreshFlight(): void {
  refreshPromise = null;
}

/**
 * Call after logout so next 401 doesn't reuse a stale in-flight refresh.
 */
export function onLogout(): void {
  clearRefreshFlight();
}
