import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type ObservabilityRecord = Record<string, unknown>;
export type ObservabilityResult = ObservabilityRecord[] | Record<string, unknown> | null;

function normalizeObservabilityPayload(raw: unknown): ObservabilityResult {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.filter((item): item is ObservabilityRecord => !!item && typeof item === "object");
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return { value: raw };
}

export async function getObservabilityLogs(): Promise<ObservabilityResult> {
  const res = await apiFetchAuthed<unknown>("/admin/observability/logs");
  return normalizeObservabilityPayload(res);
}

export async function getObservabilitySlowQueries(): Promise<ObservabilityResult> {
  const res = await apiFetchAuthed<unknown>("/admin/observability/slow-queries");
  return normalizeObservabilityPayload(res);
}