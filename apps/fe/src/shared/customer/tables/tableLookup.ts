import { apiFetch } from "../../../lib/apiFetch";

export type PublicTable = {
  id: string;
  code: string;
  status?: string;
  directionId?: string;
  seats?: number;
  areaName?: string | null;
  branchId?: string | null;
};

export async function fetchTables(): Promise<PublicTable[]> {
  const res = await apiFetch<unknown>("/tables");
  return Array.isArray(res) ? (res as PublicTable[]) : [];
}

/**
 * Resolve a tableId by (branchId?, tableCode).
 * - If branchId is provided, we match it loosely (stringified).
 * - If multiple tables match (rare), pick the first.
 */
export async function resolveTableIdByCode(input: {
  tableCode: string;
  branchId?: string | number | null;
}): Promise<{ tableId: string | null; table?: PublicTable | null }> {
  const code = String(input.tableCode ?? "").trim();
  if (!code) return { tableId: null, table: null };

  const branch =
    input.branchId != null && String(input.branchId).trim() ? String(input.branchId).trim() : null;
  const tables = await fetchTables();

  const candidates = tables.filter(
    (t) => String(t.code ?? "").trim().toLowerCase() === code.toLowerCase()
  );
  if (!candidates.length) return { tableId: null, table: null };

  const picked =
    branch != null
      ? candidates.find((t) => String(t.branchId ?? "").trim() === branch) ?? candidates[0]
      : candidates[0];

  return { tableId: picked?.id ?? null, table: picked ?? null };
}
