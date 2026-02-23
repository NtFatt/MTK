import type { ITableSessionRepository } from "../../../../application/ports/repositories/ITableSessionRepository.js";
import { TableSession } from "../../../../domain/entities/TableSession.js";
import { pool } from "../connection.js";

export class MySQLTableSessionRepository implements ITableSessionRepository {
  async create(tableId: string, openedByClientId: string | null = null): Promise<TableSession> {
    const [result]: any = await pool.query(
      `INSERT INTO table_sessions (table_id, opened_by_client_id, status)
       VALUES (?, ?, 'OPEN')`,
      [tableId, openedByClientId],
    );
    const id = String(result.insertId);

    // fetch session_key
    const s = await this.findById(id);
    if (!s) throw new Error("SESSION_CREATE_FAILED");
    return s;
  }

  async findOpenByTableId(tableId: string): Promise<TableSession | null> {
    const [rows]: any = await pool.query(
      `SELECT session_id, session_key, table_id, status, opened_at, closed_at
       FROM table_sessions
       WHERE table_id = ? AND status = 'OPEN'
       ORDER BY session_id DESC
       LIMIT 1`,
      [tableId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return new TableSession(
      String(r.session_id),
      String(r.session_key),
      String(r.table_id),
      r.status,
      new Date(r.opened_at),
      r.closed_at ? new Date(r.closed_at) : null,
    );
  }

  async findActiveByTableId(tableId: string): Promise<TableSession | null> {
    return this.findOpenByTableId(tableId);
  }

  async findBySessionKey(sessionKey: string): Promise<TableSession | null> {
    const [rows]: any = await pool.query(
      `SELECT session_id, session_key, table_id, status, opened_at, closed_at
       FROM table_sessions
       WHERE session_key = ?
       LIMIT 1`,
      [sessionKey],
    );
    const r = rows?.[0];
    if (!r) return null;
    return new TableSession(
      String(r.session_id),
      String(r.session_key),
      String(r.table_id),
      r.status,
      new Date(r.opened_at),
      r.closed_at ? new Date(r.closed_at) : null,
    );
  }

  async findById(sessionId: string): Promise<TableSession | null> {
    const [rows]: any = await pool.query(
      `SELECT session_id, session_key, table_id, status, opened_at, closed_at
       FROM table_sessions
       WHERE session_id = ?
       LIMIT 1`,
      [sessionId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return new TableSession(
      String(r.session_id),
      String(r.session_key),
      String(r.table_id),
      r.status,
      new Date(r.opened_at),
      r.closed_at ? new Date(r.closed_at) : null,
    );
  }

  async closeBySessionKey(sessionKey: string, now: Date): Promise<TableSession | null> {
    // Phase-1 performance patch: avoid SELECT ... FOR UPDATE on hot path.
    // Idempotent close: only close when status=OPEN, then read back.
    await pool.query(
      `UPDATE table_sessions
       SET status = 'CLOSED', closed_at = ?
       WHERE session_key = ? AND status = 'OPEN'`,
      [now, sessionKey],
    );

    return this.findBySessionKey(sessionKey);
  }
}
