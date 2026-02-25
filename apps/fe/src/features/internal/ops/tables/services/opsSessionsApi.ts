import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

type OpenSessionRes = any;

export async function openOpsSession(input: { tableId: string | number; directionId?: string }) {
  const body: any = { tableId: String(input.tableId) }; // ✅ string
  if (input.directionId) body.directionId = String(input.directionId);

  return apiFetchAuthed(`/admin/ops/sessions/open`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function extractSessionKey(res: any): string {
  const sk =
    res?.sessionKey ??
    res?.session_key ??
    res?.data?.sessionKey ??
    res?.data?.session_key ??
    res?.session?.sessionKey ??
    res?.session?.session_key ??
    res?.data?.session?.sessionKey ??
    res?.data?.session?.session_key;

  return typeof sk === "string" && sk.trim() ? sk.trim() : "";
}