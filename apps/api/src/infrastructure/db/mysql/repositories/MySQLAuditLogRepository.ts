import type { IAuditLogRepository, AuditLogInput } from "../../../../application/ports/repositories/IAuditLogRepository.js";
import { pool } from "../connection.js";

function toBigIntOrNull(id: string | null | undefined): number | null {
  if (!id) return null;
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return n;
}

export class MySQLAuditLogRepository implements IAuditLogRepository {
  async append(entry: AuditLogInput): Promise<void> {
    const payloadJson = entry.payload === undefined ? null : JSON.stringify(entry.payload);
    await pool.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, entity, entity_id, payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(entry.actorType),
        toBigIntOrNull(entry.actorId),
        String(entry.action),
        String(entry.entity),
        toBigIntOrNull(entry.entityId),
        payloadJson,
      ],
    );
  }
}
