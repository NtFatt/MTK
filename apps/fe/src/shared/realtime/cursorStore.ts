export type CursorValue = {
  seq: number;
  ts?: string;
};

export type CursorKeyInput = {
  room: string;
  branchId?: string | number;
  userKey: string;
};

function keyOf(input: CursorKeyInput): string {
  const b = input.branchId ?? "na";
  return `cursor:${input.room}:${b}:${input.userKey}`;
}

export function getCursor(input: CursorKeyInput): CursorValue | null {
  try {
    const raw = sessionStorage.getItem(keyOf(input));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CursorValue>;
    if (!Number.isFinite(parsed.seq) || Number(parsed.seq) < 0) return null;

    return {
      seq: Math.trunc(Number(parsed.seq)),
      ts: typeof parsed.ts === "string" ? parsed.ts : undefined,
    };
  } catch {
    return null;
  }
}

export function setCursor(input: CursorKeyInput, cursor: CursorValue): void {
  try {
    if (!Number.isFinite(cursor.seq) || cursor.seq < 0) return;

    const next: CursorValue = {
      seq: Math.trunc(cursor.seq),
      ts: typeof cursor.ts === "string" ? cursor.ts : undefined,
    };

    const existing = getCursor(input);

    // never rollback
    if (existing && next.seq <= existing.seq) return;

    sessionStorage.setItem(keyOf(input), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearCursor(input: CursorKeyInput): void {
  try {
    sessionStorage.removeItem(keyOf(input));
  } catch {
    // ignore
  }
}

export function clearCursorsForUser(userKey: string): void {
  try {
    const prefix = "cursor:";
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

export function clearAllCursors(): void {
  try {
    const prefix = "cursor:";
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith(prefix)) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}