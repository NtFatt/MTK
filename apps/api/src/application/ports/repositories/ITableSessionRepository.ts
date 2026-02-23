import { TableSession } from "../../../domain/entities/TableSession.js";

export interface ITableSessionRepository {
  create(tableId: string, openedByClientId?: string | null): Promise<TableSession>;

  /** Same semantics: get the current OPEN session for a table. */
  findOpenByTableId(tableId: string): Promise<TableSession | null>;

  /** Backward alias (some use-cases call it like this). */
  findActiveByTableId(tableId: string): Promise<TableSession | null>;

  findBySessionKey(sessionKey: string): Promise<TableSession | null>;

  /** Find by sessionId (useful for realtime scoping + redis session store) */
  findById(sessionId: string): Promise<TableSession | null>;

  /** Close an OPEN session by sessionKey (idempotent). */
  closeBySessionKey(sessionKey: string, now: Date): Promise<TableSession | null>;
}
