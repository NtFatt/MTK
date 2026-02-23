import type {
  ITableReservationRepository,
  ReservationAvailability,
  ReservationCreateInput,
  ReservationListFilter,
} from "../../../../application/ports/repositories/ITableReservationRepository.js";
import { TableReservation, type ReservationStatus } from "../../../../domain/entities/TableReservation.js";
import { pool } from "../connection.js";

function toReservation(row: any): TableReservation {
  return new TableReservation(
    String(row.reservation_id),
    String(row.reservation_code),
    String(row.table_id),
    String(row.table_code_snapshot),
    String(row.area_name_snapshot),
    Number(row.party_size),
    String(row.contact_phone),
    row.contact_name ?? null,
    row.note ?? null,
    row.status as ReservationStatus,
    new Date(row.reserved_from),
    new Date(row.reserved_to),
    row.expires_at ? new Date(row.expires_at) : null,
    row.confirmed_at ? new Date(row.confirmed_at) : null,
    row.confirmed_by_admin_id ? String(row.confirmed_by_admin_id) : null,
    row.canceled_at ? new Date(row.canceled_at) : null,
    row.checked_in_at ? new Date(row.checked_in_at) : null,
    row.session_id ? String(row.session_id) : null,
    new Date(row.created_at),
    new Date(row.updated_at),
  );
}

export class MySQLTableReservationRepository implements ITableReservationRepository {
  /**
   * Some callers historically passed a session_key (UUID) instead of the numeric session_id.
   * Since `table_reservations.session_id` is a FK to `table_sessions.session_id` (BIGINT),
   * a UUID would be coerced to 0 and cause FK errors.
   *
   * This helper makes the write path robust by accepting either session_id or session_key.
   */
  private async resolveSessionId(sessionIdOrKey: string): Promise<string> {
    const raw = String(sessionIdOrKey ?? "").trim();
    if (!raw) throw new Error("SESSION_ID_REQUIRED");

    // Fast path: numeric session_id
    if (/^\d+$/.test(raw)) return raw;

    // Fallback: treat as session_key
    const [rows]: any = await pool.query(
      `SELECT session_id
       FROM table_sessions
       WHERE session_key = ?
       LIMIT 1`,
      [raw],
    );

    const id = rows?.[0]?.session_id;
    if (!id) throw new Error("SESSION_NOT_FOUND");
    return String(id);
  }

  async expirePending(now: Date): Promise<number> {
    const [result]: any = await pool.query(
      `UPDATE table_reservations
       SET status = 'EXPIRED'
       WHERE status = 'PENDING'
         AND expires_at IS NOT NULL
         AND expires_at <= ?`,
      [now]
    );
    return Number(result?.affectedRows ?? 0);
  }

  async getAvailability(params: {
    areaName: string;
    partySize: number;
    reservedFrom: Date;
    reservedTo: Date;
    now: Date;
  }): Promise<ReservationAvailability> {
    // If reservation is soon (<=30m), require table_status AVAILABLE to avoid conflicts with walk-in.
    const enforceAvailableNow = params.reservedFrom.getTime() <= params.now.getTime() + 30 * 60 * 1000 ? 1 : 0;

    const baseWhere = `
      t.area_name = ?
      AND t.seats >= ?
      AND t.table_status <> 'OUT_OF_SERVICE'
      AND (? = 0 OR t.table_status = 'AVAILABLE')
      AND NOT EXISTS (
        SELECT 1
        FROM table_reservations r
        WHERE r.table_id = t.table_id
          AND r.status IN ('PENDING','CONFIRMED','CHECKED_IN')
          AND (r.status <> 'PENDING' OR (r.expires_at IS NULL OR r.expires_at > ?))
          AND r.reserved_from < ?
          AND r.reserved_to > ?
      )
    `;

    const args = [
      params.areaName,
      params.partySize,
      enforceAvailableNow,
      params.now,
      params.reservedTo,
      params.reservedFrom,
    ];

    const [[cnt]]: any = await pool.query(
      `SELECT COUNT(*) AS c
       FROM restaurant_tables t
       WHERE ${baseWhere}`,
      args
    );

    const availableCount = Number(cnt?.c ?? 0);
    if (availableCount <= 0) {
      return { available: false, availableCount: 0, suggestedTable: null };
    }

    const [rows]: any = await pool.query(
      `SELECT t.table_id, t.branch_id, t.table_code, t.seats, t.area_name
       FROM restaurant_tables t
       WHERE ${baseWhere}
       ORDER BY t.seats ASC, t.table_code ASC
       LIMIT 1`,
      args
    );

    const r = rows?.[0];
    if (!r) return { available: false, availableCount, suggestedTable: null };

    return {
      available: true,
      availableCount,
      suggestedTable: {
        tableId: String(r.table_id),
        branchId: String(r.branch_id),
        tableCode: String(r.table_code),
        seats: Number(r.seats),
        areaName: String(r.area_name),
      },
    };
  }

  async createPending(reservationCode: string, input: ReservationCreateInput): Promise<TableReservation> {
    await pool.query(
      `INSERT INTO table_reservations (
        reservation_code,
        table_id,
        table_code_snapshot,
        area_name_snapshot,
        party_size,
        contact_phone,
        contact_name,
        note,
        status,
        reserved_from,
        reserved_to,
        expires_at
      ) VALUES (?,?,?,?,?,?,?,?, 'PENDING', ?, ?, ?)`,
      [
        reservationCode,
        input.tableId,
        input.tableCodeSnapshot,
        input.areaNameSnapshot,
        input.partySize,
        input.contactPhone,
        input.contactName,
        input.note,
        input.reservedFrom,
        input.reservedTo,
        input.expiresAt,
      ]
    );

    const found = await this.findByCode(reservationCode);
    if (!found) throw new Error("RESERVATION_NOT_FOUND");
    return found;
  }

  async findByCode(reservationCode: string): Promise<TableReservation | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM table_reservations WHERE reservation_code = ? LIMIT 1`,
      [reservationCode]
    );
    const r = rows?.[0];
    return r ? toReservation(r) : null;
  }

  async cancelByCode(reservationCode: string, now: Date): Promise<TableReservation | null> {
    await pool.query(
      `UPDATE table_reservations
       SET status = 'CANCELED', canceled_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE reservation_code = ? AND status IN ('PENDING','CONFIRMED')`,
      [now, reservationCode]
    );
    return this.findByCode(reservationCode);
  }

  async confirmByCode(reservationCode: string, adminId: string | null, now: Date): Promise<TableReservation | null> {
    const existing = await this.findByCode(reservationCode);
    if (!existing) return null;
    if (existing.status === "CONFIRMED") return existing;
    if (existing.status === "EXPIRED") throw new Error("RESERVATION_EXPIRED");
    if (existing.status !== "PENDING") throw new Error("RESERVATION_NOT_PENDING");

    await pool.query(
      `UPDATE table_reservations
       SET status = 'CONFIRMED',
           confirmed_at = ?,
           confirmed_by_admin_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE reservation_code = ?
         AND status = 'PENDING'
         AND (expires_at IS NULL OR expires_at > ?)`,
      [now, adminId, reservationCode, now]
    );

    const updated = await this.findByCode(reservationCode);
    if (!updated) return null;
    if (updated.status === "EXPIRED") throw new Error("RESERVATION_EXPIRED");
    return updated;
  }

  async markCheckedIn(reservationCode: string, sessionId: string, now: Date): Promise<TableReservation | null> {
    const resolvedSessionId = await this.resolveSessionId(sessionId);
    await pool.query(
      `UPDATE table_reservations
       SET status = 'CHECKED_IN', checked_in_at = ?, session_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE reservation_code = ? AND status IN ('CONFIRMED','CHECKED_IN')`,
      [now, resolvedSessionId, reservationCode]
    );
    return this.findByCode(reservationCode);
  }

  async completeBySessionId(sessionId: string, now: Date): Promise<number> {
    const [result]: any = await pool.query(
      `UPDATE table_reservations
       SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'CHECKED_IN' AND session_id = ?`,
      [sessionId]
    );
    // keep "now" in signature for future extension (completed_at column, audit, ...)
    void now;
    return Number(result?.affectedRows ?? 0);
  }

  async hasConfirmedStartingSoon(tableId: string, now: Date, windowMinutes: number): Promise<boolean> {
    const to = new Date(now.getTime() + windowMinutes * 60 * 1000);
    const [rows]: any = await pool.query(
      `SELECT 1
       FROM table_reservations
       WHERE table_id = ?
         AND status = 'CONFIRMED'
         AND reserved_from >= ?
         AND reserved_from <= ?
       LIMIT 1`,
      [tableId, now, to]
    );
    return !!rows?.[0];
  }

  async list(filter: ReservationListFilter): Promise<TableReservation[]> {
    const where: string[] = [];
    const args: any[] = [];

    if (filter.branchId) {
      where.push(`branch_id = ?`);
      args.push(filter.branchId);
    }

    if (filter.status) {
      where.push(`status = ?`);
      args.push(filter.status);
    }
    if (filter.phone) {
      where.push(`contact_phone LIKE ?`);
      args.push(`%${filter.phone}%`);
    }
    if (filter.from) {
      where.push(`reserved_from >= ?`);
      args.push(filter.from);
    }
    if (filter.to) {
      where.push(`reserved_to <= ?`);
      args.push(filter.to);
    }

    const limit = Math.min(Math.max(Number(filter.limit ?? 50), 1), 200);
    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows]: any = await pool.query(
      `SELECT * FROM table_reservations ${sqlWhere}
       ORDER BY reserved_from DESC, reservation_id DESC
       LIMIT ?`,
      [...args, limit]
    );

    return (rows ?? []).map((r: any) => toReservation(r));
  }
}
