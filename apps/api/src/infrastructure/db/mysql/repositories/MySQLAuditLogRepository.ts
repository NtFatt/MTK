import type {
  AuditLogInput,
  IAuditLogRepository,
  InventoryAdjustmentAuditRow,
  ListInventoryAdjustmentAuditQuery,
  ListInventoryAdjustmentAuditResult,
} from "../../../../application/ports/repositories/IAuditLogRepository.js";
import { pool } from "../connection.js";

function toBigIntOrNull(id: string | null | undefined): number | null {
  if (!id) return null;
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toIso(v: unknown): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  return new Date(v as any).toISOString();
}

function toNullableString(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

function toNullableInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
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

  async listInventoryAdjustmentAudit(
    query: ListInventoryAdjustmentAuditQuery,
  ): Promise<ListInventoryAdjustmentAuditResult> {
    const limit = Math.max(1, Math.min(200, Number(query.limit || 50)));

    let sql = `
      SELECT
        a.audit_id as auditId,
        a.action as action,
        a.actor_type as actorType,
        a.actor_id as actorId,
        COALESCE(au.full_name, su.full_name, NULL) as actorName,
        COALESCE(au.username, su.username, NULL) as actorUsername,
        JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.branchId')) as branchId,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.itemId')),
          CAST(a.entity_id AS CHAR)
        ) as itemId,
        mi.item_name as itemName,
        JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.mode')) as mode,
        JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.reason')) as reason,
        JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.ip')) as ip,
        JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.userAgent')) as userAgent,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.prevQty')) AS SIGNED) as prevQty,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.newQty')) AS SIGNED) as newQty,
        a.created_at as createdAt
      FROM audit_logs a
      LEFT JOIN admin_users au
        ON a.actor_type = 'ADMIN' AND au.admin_id = a.actor_id
      LEFT JOIN staff_users su
        ON a.actor_type = 'STAFF' AND su.staff_id = a.actor_id
      LEFT JOIN menu_items mi
        ON mi.item_id = COALESCE(
          CAST(JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.itemId')) AS UNSIGNED),
          a.entity_id
        )
      WHERE a.action = 'inventory.adjust'
        AND JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.branchId')) = ?
    `;

    const params: any[] = [String(query.branchId)];

    if (query.itemId) {
      sql += `
        AND COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.itemId')),
          CAST(a.entity_id AS CHAR)
        ) = ?
      `;
      params.push(String(query.itemId));
    }

    if (query.actorId) {
      sql += `
        AND CAST(a.actor_id AS CHAR) = ?
      `;
      params.push(String(query.actorId));
    }

    if (query.mode) {
      sql += `
        AND UPPER(JSON_UNQUOTE(JSON_EXTRACT(a.payload, '$.mode'))) = ?
      `;
      params.push(String(query.mode).toUpperCase());
    }

    if (query.from) {
      sql += ` AND a.created_at >= ? `;
      params.push(new Date(query.from));
    }

    if (query.to) {
      sql += ` AND a.created_at <= ? `;
      params.push(new Date(query.to));
    }

    if (query.beforeAuditId) {
      sql += ` AND a.audit_id < ? `;
      params.push(Number(query.beforeAuditId));
    }

    sql += `
      ORDER BY a.audit_id DESC
      LIMIT ?
    `;
    params.push(limit + 1);

    const [rows] = await pool.query(sql, params);

    const mapped = ((rows as any[]) ?? []).map((r): InventoryAdjustmentAuditRow => {
      const prevQty = toNullableInt(r.prevQty);
      const newQty = toNullableInt(r.newQty);
      const delta = prevQty === null || newQty === null ? null : newQty - prevQty;

      return {
        auditId: String(r.auditId),
        action: String(r.action ?? "inventory.adjust"),
        actorType: String(r.actorType ?? "SYSTEM") as any,
        actorId: toNullableString(r.actorId),
        actorName: toNullableString(r.actorName),
        actorUsername: toNullableString(r.actorUsername),
        branchId: String(r.branchId ?? query.branchId),
        itemId: String(r.itemId ?? ""),
        itemName: toNullableString(r.itemName),
        mode: toNullableString(r.mode),
        reason: toNullableString(r.reason),
        prevQty,
        newQty,
        delta,
        ip: toNullableString(r.ip),
        userAgent: toNullableString(r.userAgent),
        createdAt: toIso(r.createdAt),
      };
    });

    const hasMore = mapped.length > limit;
    const items = hasMore ? mapped.slice(0, limit) : mapped;
    const nextCursor = hasMore ? items[items.length - 1]?.auditId ?? null : null;

    return { items, nextCursor, hasMore };
  }
}