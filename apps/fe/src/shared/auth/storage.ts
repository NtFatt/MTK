/**
 * Session storage helpers. Keys consistent; no logging.
 * Prefer refresh in httpOnly cookie; if server returns refreshToken in JSON use sessionStorage with TTL.
 */
import type { AuthSession } from "./types";

const KEY_ACCESS = "hadilao.access";
const KEY_REFRESH = "hadilao.refresh";
const KEY_SESSION = "hadilao.session";

export function loadSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(KEY_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt != null && session.expiresAt < Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(KEY_SESSION, JSON.stringify(session));
    sessionStorage.setItem(KEY_ACCESS, session.accessToken);
    if (session.refreshToken != null) {
      sessionStorage.setItem(KEY_REFRESH, session.refreshToken);
    } else {
      sessionStorage.removeItem(KEY_REFRESH);
    }
  } catch {
    // no-op
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY_SESSION);
    sessionStorage.removeItem(KEY_ACCESS);
    sessionStorage.removeItem(KEY_REFRESH);
  } catch {
    // no-op
  }
}
