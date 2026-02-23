/**
 * Idempotency keys for customer-safe operations (order create, payment init).
 * Scope per session/order to allow retry without duplicate side effects.
 */

const STORAGE_PREFIX = "hadilao.idem.";

export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function getOrCreateIdempotencyKey(scope: string): string {
  const key = `${STORAGE_PREFIX}${scope}`;
  try {
    const existing = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
    if (existing) return existing;
    const newKey = createIdempotencyKey();
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, newKey);
    return newKey;
  } catch {
    return createIdempotencyKey();
  }
}

export function clearIdempotencyKey(scope: string): void {
  const key = `${STORAGE_PREFIX}${scope}`;
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
