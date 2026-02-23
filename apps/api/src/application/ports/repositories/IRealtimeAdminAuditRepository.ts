export type AdminRealtimeAuditEvent = {
  room: string;
  eventId: string;
  version: number;
  seq: number;
  type: string;
  at: string; // ISO
  scope: unknown;
  payload: unknown;
  meta: unknown;
};

export type ListAdminRealtimeAuditQuery = {
  room?: string; // default 'admin'
  limit: number;

  // Optional replay support:
  // - fromSeq: return events with seq >= fromSeq
  // - direction: 'asc' is used for replay, 'desc' is used for "latest" view
  fromSeq?: number;
  direction?: "asc" | "desc";
};

export type AdminRealtimeAuditRow = AdminRealtimeAuditEvent & {
  createdAt: string; // ISO
};

export interface IRealtimeAdminAuditRepository {
  appendAdminEvent(event: AdminRealtimeAuditEvent): Promise<void>;
  listAdminEvents(query: ListAdminRealtimeAuditQuery): Promise<AdminRealtimeAuditRow[]>;
}
