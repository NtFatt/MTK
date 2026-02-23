/**
 * Access token accessor for authedFetch. Avoids importing store in too many places.
 */
import { authStore } from "./authStore";

export function getAccessToken(): string | null {
  return authStore.getState().session?.accessToken ?? null;
}
