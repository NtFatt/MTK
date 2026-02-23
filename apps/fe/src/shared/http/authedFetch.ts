/**
 * Authenticated fetch: Bearer token + 401 → single-flight refresh → retry once or logout + redirect.
 * Does not modify src/lib/apiFetch.ts.
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api/v1";

import { getAccessToken } from "../auth/token";
import { authStore } from "../auth/authStore";
import { refreshOnce, onLogout } from "./refreshSingleFlight";
import { normalizeApiError } from "./normalizeApiError";
import type { HttpError } from "./errors";

export type AuthedFetchOptions = RequestInit & {
  idempotencyKey?: string;
};

async function doFetch(
  path: string,
  options: AuthedFetchOptions,
  token: string | null
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  return fetch(url, { ...options, headers });
}

function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!res.ok) {
    const payload = isJson ? res.json().catch(() => null) : res.text().catch(() => null);
    return payload.then((p) => {
      throw { status: res.status, payload: p };
    });
  }
  if (res.status === 204) return Promise.resolve(undefined as T);
  return (isJson ? res.json() : res.text()) as Promise<T>;
}

export async function apiFetchAuthed<T>(
  path: string,
  options: AuthedFetchOptions = {}
): Promise<T> {
  const token = getAccessToken();

  const run = async (accessToken: string | null): Promise<T> => {
    const res = await doFetch(path, options, accessToken);

    if (res.status === 401) {
      const session = await refreshOnce();
      if (session) {
        authStore.getState().setSession(session);
        const retryRes = await doFetch(path, options, getAccessToken());
        return parseResponse<T>(retryRes);
      }
      onLogout();
      authStore.getState().logout();
      window.location.assign("/i/login?reason=session_expired");
      throw normalizeApiError({ status: 401, payload: { message: "Session expired" } });
    }

    return parseResponse<T>(res);
  };

  try {
    return await run(token);
  } catch (err) {
    throw normalizeApiError(err) as HttpError;
  }
}
