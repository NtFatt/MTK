export type AuditActorType = "ADMIN" | "STAFF" | "CLIENT" | "SYSTEM";

export type AuditLogInput = {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  payload?: unknown;
};

export type InventoryAdjustmentAuditRow = {
  auditId: string;
  action: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  branchId: string;
  itemId: string;
  itemName: string | null;
  mode: string | null;
  reason: string | null;
  prevQty: number | null;
  newQty: number | null;
  delta: number | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ListInventoryAdjustmentAuditQuery = {
  branchId: string;
  itemId?: string | null;
  actorId?: string | null;
  mode?: string | null;
  from?: string | null;
  to?: string | null;
  limit: number;
  beforeAuditId?: string | null;
};

export type ListInventoryAdjustmentAuditResult = {
  items: InventoryAdjustmentAuditRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export interface IAuditLogRepository {
  append(entry: AuditLogInput): Promise<void>;
  listInventoryAdjustmentAudit(
    query: ListInventoryAdjustmentAuditQuery
  ): Promise<ListInventoryAdjustmentAuditResult>;
}