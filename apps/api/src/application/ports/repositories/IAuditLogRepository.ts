export type AuditActorType = "ADMIN" | "STAFF" | "CLIENT" | "SYSTEM";

export type AuditLogInput = {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  payload?: unknown;
};

export interface IAuditLogRepository {
  append(entry: AuditLogInput): Promise<void>;
}
