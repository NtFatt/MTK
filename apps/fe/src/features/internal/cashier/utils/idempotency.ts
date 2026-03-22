function safeSessionStorageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // noop
  }
}

function safeSessionStorageRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // noop
  }
}

function makeUuid(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCashierIdempotencyKey(scope: string): string {
  const storageKey = `idem:${scope}`;
  const existing = safeSessionStorageGet(storageKey);
  if (existing) return existing;

  const created = makeUuid();
  safeSessionStorageSet(storageKey, created);
  return created;
}

export function clearCashierIdempotencyKey(scope: string) {
  safeSessionStorageRemove(`idem:${scope}`);
}
