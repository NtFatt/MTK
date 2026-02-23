type Cursor = { seq: number; ts?: string };

function key(room: string, branchId: string | number | undefined, userKey: string) {
  const b = branchId ?? "na";
  return `cursor:${room}:${b}:${userKey}`;
}

export function getCursor(room: string, branchId: string | number | undefined, userKey: string): Cursor | null {
  try {
    const raw = sessionStorage.getItem(key(room, branchId, userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cursor;
    if (typeof parsed?.seq !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCursor(room: string, branchId: string | number | undefined, userKey: string, cursor: Cursor) {
  try {
    const k = key(room, branchId, userKey);
    const existing = getCursor(room, branchId, userKey);
    // never rollback
    if (existing && cursor.seq <= existing.seq) return;
    sessionStorage.setItem(k, JSON.stringify(cursor));
  } catch {
    // ignore
  }
}

export function clearCursorsForUser(userKey: string) {
  try {
    const prefix = `cursor:`;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith(prefix) && k.endsWith(`:${userKey}`)) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

export function clearAllCursors() {
  try {
    const prefix = `cursor:`;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith(prefix)) sessionStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
