import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type RealtimeAdminRecord = Record<string, unknown>;
export type RealtimeAdminResult = RealtimeAdminRecord[] | Record<string, unknown> | null;

export type RealtimeReplayInput = {
  room: string;
  fromSeq?: number;
  limit?: number;
};

function normalizeRealtimePayload(raw: unknown): RealtimeAdminResult {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is RealtimeAdminRecord => !!item && typeof item === "object",
    );
  }

  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }

  return { value: raw };
}

function buildReplayQuery(input: RealtimeReplayInput) {
  const qs = new URLSearchParams();

  if (input.room.trim()) {
    qs.set("room", input.room.trim());
  }

  if (input.fromSeq != null && Number.isFinite(input.fromSeq)) {
    qs.set("fromSeq", String(input.fromSeq));
  }

  if (input.limit != null && Number.isFinite(input.limit)) {
    qs.set("limit", String(input.limit));
  }

  return qs.toString();
}

export async function getRealtimeAudit(): Promise<RealtimeAdminResult> {
  const res = await apiFetchAuthed<unknown>("/admin/realtime/audit");
  return normalizeRealtimePayload(res);
}

export async function getRealtimeReplay(
  input: RealtimeReplayInput,
): Promise<RealtimeAdminResult> {
  const query = buildReplayQuery(input);
  const path = query
    ? `/admin/realtime/replay?${query}`
    : "/admin/realtime/replay";

  const res = await apiFetchAuthed<unknown>(path);
  return normalizeRealtimePayload(res);
}