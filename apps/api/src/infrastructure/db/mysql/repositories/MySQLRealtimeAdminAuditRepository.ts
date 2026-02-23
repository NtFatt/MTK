import { pool } from "../connection.js";
import type {
  AdminRealtimeAuditEvent,
  AdminRealtimeAuditRow,
  IRealtimeAdminAuditRepository,
  ListAdminRealtimeAuditQuery,
} from "../../../../application/ports/repositories/IRealtimeAdminAuditRepository.js";

function toIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
}

export class MySQLRealtimeAdminAuditRepository implements IRealtimeAdminAuditRepository {
  async appendAdminEvent(event: AdminRealtimeAuditEvent): Promise<void> {
    await pool.execute(
      `
        INSERT INTO realtime_admin_audit
          (room, event_id, event_version, seq, event_type, event_at, scope_json, payload_json, meta_json)
        VALUES
          (?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON))
      `,
      [
        event.room,
        event.eventId,
        event.version,
        event.seq,
        event.type,
        new Date(event.at),
        JSON.stringify(event.scope ?? null),
        JSON.stringify(event.payload ?? null),
        JSON.stringify(event.meta ?? null),
      ],
    );
  }

  async listAdminEvents(query: ListAdminRealtimeAuditQuery): Promise<AdminRealtimeAuditRow[]> {
    const room = query.room ?? "admin";
    const limit = Math.max(1, Math.min(500, Number(query.limit || 100)));
    const direction = query.direction ?? (query.fromSeq !== undefined ? "asc" : "desc");

    let sql = `
      SELECT
        room,
        event_id as eventId,
        event_version as version,
        seq,
        event_type as type,
        event_at as at,
        scope_json as scope,
        payload_json as payload,
        meta_json as meta,
        created_at as createdAt
      FROM realtime_admin_audit
      WHERE room = ?
    `;

    const params: any[] = [room];

    if (query.fromSeq !== undefined && query.fromSeq !== null) {
      const fromSeq = Math.max(0, Number(query.fromSeq));
      sql += " AND seq >= ?\n";
      params.push(fromSeq);
    }

    if (direction === "asc") {
      sql += " ORDER BY seq ASC\n";
    } else {
      sql += " ORDER BY id DESC\n";
    }

    sql += " LIMIT ?";
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    return (rows as any[]).map((r) => ({
      room: String(r.room),
      eventId: String(r.eventId),
      version: Number(r.version),
      seq: Number(r.seq),
      type: String(r.type),
      at: toIso(r.at),
      scope: r.scope ?? null,
      payload: r.payload ?? null,
      meta: r.meta ?? null,
      createdAt: toIso(r.createdAt),
    }));
  }
}
