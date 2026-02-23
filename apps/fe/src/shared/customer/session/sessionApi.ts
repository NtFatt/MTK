/**
 * Session API — contract-first.
 * - POST /api/v1/sessions/open (BE accepts { tableId } or { directionId }).
 * - GET /api/v1/sessions/:sessionKey is best-effort (BE may not expose it).
 */
import { apiFetch } from "../../../lib/apiFetch";
import type { CustomerSession } from "./types";

export type OpenSessionPayload = {
  /** Prefer tableId for QR/table-code flow (BE accepts tableId). */
  tableId?: string;
  /** Optional: open any available table under a direction (BE accepts directionId). */
  directionId?: string;
};

/** BE returns { created, table, session, ...aliases }. Map to CustomerSession for store. */
type OpenSessionDto = {
  created?: boolean;
  table?: {
    id?: string;
    code?: string;
    directionId?: string;
    branchId?: string | null;
  };
  session?: {
    id?: string;
    sessionKey?: string;
    openedAt?: string;
  };
  sessionKey?: string;
  sessionId?: string;
};

function mapToCustomerSession(dto: OpenSessionDto): CustomerSession {
  const sessionKey = dto.sessionKey ?? dto.session?.sessionKey;
  if (!sessionKey) throw new Error("Missing sessionKey");
  return {
    sessionKey,
    sessionId: dto.sessionId ?? dto.session?.id,
    tableId: dto.table?.id,
    directionId: dto.table?.directionId,
    branchId: dto.table?.branchId ?? undefined,
    tableCode: dto.table?.code,
    openedAt: dto.session?.openedAt,
  };
}

export async function openSession(payload: OpenSessionPayload): Promise<CustomerSession> {
  const res = await apiFetch<OpenSessionDto>("/sessions/open", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapToCustomerSession(res);
}

/**
 * GET session by key (bootstrap/validate).
 * If backend does not implement this yet, will 404 — bootstrap page will show error + link to /c/qr.
 */
export async function getSession(sessionKey: string): Promise<CustomerSession> {
  // NOTE: BE may not expose GET /sessions/:sessionKey. This remains best-effort.
  const res = await apiFetch<OpenSessionDto>(`/sessions/${encodeURIComponent(sessionKey)}`);
  return mapToCustomerSession(res);
}
