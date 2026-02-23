export type DomainEventScope = {
  sessionId?: string | null;
  sessionKey?: string | null;
  tableId?: string | null;
  branchId?: string | null;
  orderId?: string | null;
  reservationId?: string | null;
  clientId?: string | null;
};

export type DomainEventMeta = {
  rid?: string; // request id
  actor?: unknown; // {kind,id,...} from requestContext
  ip?: string;
  userAgent?: string;
};

export type DomainEvent<TPayload = any> = {
  type: string;
  at: string; // ISO timestamp
  scope?: DomainEventScope;
  payload: TPayload;

  // Optional trace/audit metadata (transported via EventBus).
  meta?: DomainEventMeta;
};

export type DomainEventHandler = (event: DomainEvent) => void | Promise<void>;
