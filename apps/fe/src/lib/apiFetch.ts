import { normalizeApiError } from "@hadilao/contracts";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api/v1";

type ApiFetchOptions = RequestInit & {
  idempotencyKey?: string; // opt-in theo operation
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers);

  // JSON body convenience
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Idempotency: chỉ bật khi caller truyền key
  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
      throw { status: res.status, payload };
    }

    if (res.status === 204) return undefined as T;
    return (isJson ? await res.json() : await res.text()) as T;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
