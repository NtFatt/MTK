import {
  Schemas,
  type AdminTableMutationPayload,
  type AdminTableRecord,
} from "@hadilao/contracts";
import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

function normalizePayload(payload: AdminTableMutationPayload): AdminTableMutationPayload {
  return Schemas.zAdminTableMutationPayload.parse(payload);
}

function normalizeRecord(raw: unknown): AdminTableRecord {
  return Schemas.zAdminTableRecord.parse(raw);
}

export type CreateTablePayload = AdminTableMutationPayload;
export type UpdateTablePayload = AdminTableMutationPayload;

export async function createTable(payload: CreateTablePayload): Promise<AdminTableRecord> {
  const body = normalizePayload(payload);
  const res = await apiFetchAuthed<unknown>("/admin/tables", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return normalizeRecord(res);
}

export async function updateTable(
  tableId: string,
  payload: UpdateTablePayload,
): Promise<AdminTableRecord> {
  const body = normalizePayload(payload);
  const res = await apiFetchAuthed<unknown>(`/admin/tables/${tableId}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return normalizeRecord(res);
}

export async function deleteTable(branchId: string | number, tableId: string) {
  return apiFetchAuthed<void>(`/admin/tables/${tableId}?branchId=${branchId}`, {
    method: "DELETE",
  });
}
