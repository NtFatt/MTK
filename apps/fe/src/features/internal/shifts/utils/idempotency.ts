const PREFIX = "shift:idempotency:";

function buildStorageKey(scope: string) {
  return `${PREFIX}${scope}`;
}

export function getShiftIdempotencyKey(scope: string): string {
  const key = buildStorageKey(scope);
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function clearShiftIdempotencyKey(scope: string) {
  try {
    sessionStorage.removeItem(buildStorageKey(scope));
  } catch {
    // noop
  }
}
