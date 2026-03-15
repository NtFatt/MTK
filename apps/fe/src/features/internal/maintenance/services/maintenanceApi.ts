import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type MaintenanceInput = {
  branchId?: string | number;
  lockAheadMinutes?: number;
  noShowGraceMinutes?: number;
  sessionStaleMinutes?: number;
};

export type MaintenanceResult = Record<string, unknown>;

function buildQuery(input: MaintenanceInput) {
  const qs = new URLSearchParams();

  if (input.branchId != null && String(input.branchId).trim()) {
    qs.set("branchId", String(input.branchId));
  }

  if (input.lockAheadMinutes != null) {
    qs.set("lockAheadMinutes", String(input.lockAheadMinutes));
  }

  if (input.noShowGraceMinutes != null) {
    qs.set("noShowGraceMinutes", String(input.noShowGraceMinutes));
  }

  if (input.sessionStaleMinutes != null) {
    qs.set("sessionStaleMinutes", String(input.sessionStaleMinutes));
  }

  return qs.toString();
}

export async function runMaintenance(input: MaintenanceInput): Promise<MaintenanceResult> {
  const query = buildQuery(input);
  const path = query
    ? `/admin/maintenance/run?${query}`
    : "/admin/maintenance/run";

  return apiFetchAuthed<MaintenanceResult>(path, {
    method: "POST",
  });
}

export async function syncTableStatus(input: MaintenanceInput): Promise<MaintenanceResult> {
  const query = buildQuery(input);
  const path = query
    ? `/admin/maintenance/sync-table-status?${query}`
    : "/admin/maintenance/sync-table-status";

  return apiFetchAuthed<MaintenanceResult>(path, {
    method: "POST",
  });
}