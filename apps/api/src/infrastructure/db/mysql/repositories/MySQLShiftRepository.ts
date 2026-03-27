import type {
  IShiftRepository,
  ShiftBreakdownInput,
  ShiftBreakdownRow,
  ShiftRunView,
  ShiftSummary,
} from "../../../../application/ports/repositories/IShiftRepository.js";
import { getShiftTemplate, SHIFT_TEMPLATES, type ShiftCode } from "../../../../domain/shifts/templates.js";
import { pool } from "../connection.js";

const DENOMINATIONS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;

function toIso(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnly(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toMoney(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

function normalizeBreakdown(input: ShiftBreakdownInput[]): ShiftBreakdownRow[] {
  const byDenomination = new Map<number, number>();

  for (const row of input ?? []) {
    const denomination = Number(row?.denomination ?? 0);
    const quantity = Number(row?.quantity ?? 0);

    if (!DENOMINATIONS.includes(denomination as any)) throw new Error("SHIFT_BREAKDOWN_DENOMINATION_INVALID");
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error("SHIFT_BREAKDOWN_QUANTITY_INVALID");

    byDenomination.set(denomination, quantity);
  }

  return DENOMINATIONS.map((denomination) => {
    const quantity = byDenomination.get(denomination) ?? 0;
    return {
      denomination,
      quantity,
      amount: denomination * quantity,
    };
  });
}

function sumBreakdown(rows: ShiftBreakdownRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

async function fetchBreakdown(
  db: { query: typeof pool.query },
  shiftRunId: string,
  type: "OPENING" | "COUNTED",
): Promise<ShiftBreakdownRow[]> {
  const [rows]: any = await db.query(
    `SELECT denomination, quantity, amount
     FROM shift_cash_breakdowns
     WHERE shift_run_id = ? AND type = ?
     ORDER BY denomination DESC`,
    [shiftRunId, type],
  );

  if (!rows?.length) {
    return normalizeBreakdown([]);
  }

  return normalizeBreakdown(
    rows.map((row: any) => ({
      denomination: Number(row.denomination),
      quantity: Number(row.quantity ?? 0),
    })),
  );
}

async function fetchSummary(
  db: { query: typeof pool.query },
  branchId: string,
  openedAt: string,
  closedAt: string | null,
  openingFloat: number,
): Promise<ShiftSummary> {
  const upperBound = closedAt ? new Date(closedAt) : new Date();

  const [paymentRows]: any = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN UPPER(p.provider) = 'CASH' THEN p.amount ELSE 0 END), 0) AS cashSales,
       COALESCE(SUM(CASE WHEN UPPER(p.provider) <> 'CASH' THEN p.amount ELSE 0 END), 0) AS nonCashSales,
       COUNT(DISTINCT p.order_id) AS paidOrderCount,
       MAX(p.updated_at) AS lastPaymentAt
     FROM payments p
     JOIN orders o ON o.order_id = p.order_id
     WHERE o.branch_id = ?
       AND p.status = 'SUCCESS'
       AND p.updated_at >= ?
       AND p.updated_at <= ?`,
    [branchId, new Date(openedAt), upperBound],
  );

  const paymentRow = paymentRows?.[0] ?? {};

  const [unpaidRows]: any = await db.query(
    `SELECT COUNT(*) AS total
     FROM orders
     WHERE branch_id = ?
       AND order_status NOT IN ('PAID', 'CANCELED')`,
    [branchId],
  );

  const cashSales = toMoney(paymentRow.cashSales);
  const nonCashSales = toMoney(paymentRow.nonCashSales);
  const unpaidCount = Number(unpaidRows?.[0]?.total ?? 0);

  return {
    openingFloat,
    cashSales,
    nonCashSales,
    cashIn: 0,
    cashOut: 0,
    refunds: 0,
    expectedCash: openingFloat + cashSales,
    unpaidCount,
    paidOrderCount: Number(paymentRow.paidOrderCount ?? 0),
    lastPaymentAt: toIso(paymentRow.lastPaymentAt),
  };
}

function mapTime(value: unknown): string {
  if (typeof value === "string") return value;
  const iso = toIso(value);
  return iso ? iso.slice(11, 19) : "";
}

async function hydrateShift(
  db: { query: typeof pool.query },
  row: any,
): Promise<ShiftRunView> {
  const shiftRunId = String(row.shift_run_id);
  const openingBreakdown = await fetchBreakdown(db, shiftRunId, "OPENING");
  const countedBreakdown = await fetchBreakdown(db, shiftRunId, "COUNTED");
  const openedAt = toIso(row.opened_at);
  const closedAt = toIso(row.closed_at);
  if (!openedAt) throw new Error("SHIFT_INVALID_OPENED_AT");

  const openingFloat = toMoney(row.opening_float);
  const summary = await fetchSummary(db, String(row.branch_id), openedAt, closedAt, openingFloat);

  return {
    shiftRunId,
    branchId: String(row.branch_id),
    businessDate: toDateOnly(row.business_date),
    shiftCode: String(row.shift_code).toUpperCase() as ShiftCode,
    shiftName: String(row.shift_name ?? ""),
    startTime: mapTime(row.start_time),
    endTime: mapTime(row.end_time),
    crossesMidnight: Boolean(row.crosses_midnight),
    status: String(row.status).toUpperCase() as any,
    openedByUserId: String(row.opened_by_user_id ?? ""),
    openedByName: String(row.opened_by_name ?? ""),
    closedByUserId: row.closed_by_user_id != null ? String(row.closed_by_user_id) : null,
    closedByName: row.closed_by_name != null ? String(row.closed_by_name) : null,
    openedAt,
    closedAt,
    openingFloat,
    expectedCash: summary.expectedCash,
    countedCash: row.counted_cash != null ? toMoney(row.counted_cash) : null,
    variance: row.variance != null ? toMoney(row.variance) : null,
    openingNote: row.opening_note != null ? String(row.opening_note) : null,
    closeNote: row.close_note != null ? String(row.close_note) : null,
    version: Number(row.version ?? 1),
    openingBreakdown,
    countedBreakdown,
    summary,
  };
}

export class MySQLShiftRepository implements IShiftRepository {
  async listTemplates(_branchId: string) {
    return SHIFT_TEMPLATES;
  }

  async getCurrent(branchId: string): Promise<ShiftRunView | null> {
    const [rows]: any = await pool.query(
      `SELECT *
       FROM shift_runs
       WHERE branch_id = ?
         AND status = 'OPEN'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [branchId],
    );

    const row = rows?.[0];
    return row ? hydrateShift(pool, row) : null;
  }

  async listHistory(input: { branchId: string; limit: number }): Promise<ShiftRunView[]> {
    const limit = Math.max(1, Math.min(50, Number(input.limit ?? 20)));
    const [rows]: any = await pool.query(
      `SELECT *
       FROM shift_runs
       WHERE branch_id = ?
       ORDER BY business_date DESC, opened_at DESC
       LIMIT ?`,
      [input.branchId, limit],
    );

    return Promise.all(((rows as any[]) ?? []).map((row) => hydrateShift(pool, row)));
  }

  async openShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    openingFloat: number;
    openingBreakdown: ShiftBreakdownInput[];
    note?: string | null;
    actor: { userId: string; name: string };
  }): Promise<ShiftRunView> {
    const template = getShiftTemplate(input.shiftCode);
    if (!template) throw new Error("SHIFT_TEMPLATE_INVALID");

    const openingBreakdown = normalizeBreakdown(input.openingBreakdown);
    const openingFloat = toMoney(input.openingFloat);
    if (sumBreakdown(openingBreakdown) !== openingFloat) {
      throw new Error("SHIFT_OPENING_FLOAT_MISMATCH");
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [openRows]: any = await conn.query(
        `SELECT shift_run_id
         FROM shift_runs
         WHERE branch_id = ? AND status = 'OPEN'
         LIMIT 1
         FOR UPDATE`,
        [input.branchId],
      );
      if (openRows?.length) throw new Error("SHIFT_ALREADY_OPEN");

      if (input.shiftCode === "EVENING") {
        const [prevRows]: any = await conn.query(
          `SELECT shift_run_id
           FROM shift_runs
           WHERE branch_id = ?
             AND business_date = ?
             AND shift_code = 'MORNING'
             AND status NOT IN ('CLOSED', 'FORCE_CLOSED')
           LIMIT 1
           FOR UPDATE`,
          [input.branchId, input.businessDate],
        );
        if (prevRows?.length) throw new Error("SHIFT_PREVIOUS_NOT_CLOSED");
      }

      const [existingRows]: any = await conn.query(
        `SELECT shift_run_id, status
         FROM shift_runs
         WHERE branch_id = ?
           AND business_date = ?
           AND shift_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.branchId, input.businessDate, input.shiftCode],
      );
      if (existingRows?.length) {
        const existingStatus = String(existingRows[0].status ?? "").toUpperCase();
        const terminalStatuses = new Set(["CLOSED", "FORCE_CLOSED", "CANCELLED"]);
        if (!terminalStatuses.has(existingStatus)) {
          throw new Error("SHIFT_ALREADY_EXISTS");
        }
        // Previous shift is in a terminal state → remove it to allow re-opening
        const oldId = existingRows[0].shift_run_id;
        await conn.query(`DELETE FROM shift_cash_breakdowns WHERE shift_run_id = ?`, [oldId]);
        await conn.query(`DELETE FROM shift_runs WHERE shift_run_id = ?`, [oldId]);
      }

      const [result]: any = await conn.query(
        `INSERT INTO shift_runs (
           branch_id,
           business_date,
           shift_code,
           shift_name,
           start_time,
           end_time,
           crosses_midnight,
           status,
           opened_by_user_id,
           opened_by_name,
           opened_at,
           opening_float,
           expected_cash,
           opening_note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
        [
          input.branchId,
          input.businessDate,
          input.shiftCode,
          template.name,
          template.startTime,
          template.endTime,
          template.crossesMidnight ? 1 : 0,
          input.actor.userId,
          input.actor.name,
          openingFloat,
          openingFloat,
          input.note ?? null,
        ],
      );

      const shiftRunId = String(result?.insertId ?? "");
      if (!shiftRunId) throw new Error("SHIFT_OPEN_FAILED");

      for (const row of openingBreakdown) {
        await conn.query(
          `INSERT INTO shift_cash_breakdowns (
             shift_run_id,
             type,
             denomination,
             quantity,
             amount
           ) VALUES (?, 'OPENING', ?, ?, ?)`,
          [shiftRunId, row.denomination, row.quantity, row.amount],
        );
      }

      await conn.commit();

      const [rows]: any = await pool.query(
        `SELECT * FROM shift_runs WHERE shift_run_id = ? LIMIT 1`,
        [shiftRunId],
      );
      return hydrateShift(pool, rows[0]);
    } catch (error: any) {
      await conn.rollback();
      if (error?.code === "ER_DUP_ENTRY") {
        throw new Error("SHIFT_ALREADY_OPEN");
      }
      throw error;
    } finally {
      conn.release();
    }
  }

  async closeShift(input: {
    shiftRunId: string;
    branchId: string;
    countedBreakdown: ShiftBreakdownInput[];
    note?: string | null;
    expectedVersion?: number | null;
    actor: { userId: string; name: string };
  }): Promise<ShiftRunView> {
    const countedBreakdown = normalizeBreakdown(input.countedBreakdown);
    const countedCash = sumBreakdown(countedBreakdown);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        `SELECT *
         FROM shift_runs
         WHERE shift_run_id = ?
           AND branch_id = ?
         LIMIT 1
         FOR UPDATE`,
        [input.shiftRunId, input.branchId],
      );
      const row = rows?.[0];
      if (!row) throw new Error("SHIFT_NOT_FOUND");
      if (String(row.status).toUpperCase() !== "OPEN") throw new Error("SHIFT_NOT_OPEN");

      const currentVersion = Number(row.version ?? 1);
      if (
        input.expectedVersion != null &&
        Number.isFinite(Number(input.expectedVersion)) &&
        currentVersion !== Number(input.expectedVersion)
      ) {
        throw new Error("SHIFT_STALE");
      }

      const [unpaidRows]: any = await conn.query(
        `SELECT COUNT(*) AS total
         FROM orders
         WHERE branch_id = ?
           AND order_status NOT IN ('PAID', 'CANCELED')`,
        [input.branchId],
      );
      const unpaidCount = Number(unpaidRows?.[0]?.total ?? 0);
      if (unpaidCount > 0) throw new Error("SHIFT_HAS_UNPAID_ORDERS");

      const openedAt = toIso(row.opened_at);
      if (!openedAt) throw new Error("SHIFT_INVALID_OPENED_AT");
      const openingFloat = toMoney(row.opening_float);
      const summary = await fetchSummary(conn, input.branchId, openedAt, null, openingFloat);
      const variance = countedCash - summary.expectedCash;

      if (variance !== 0 && !String(input.note ?? "").trim()) {
        throw new Error("SHIFT_CLOSE_NOTE_REQUIRED");
      }

      const [updateResult]: any = await conn.query(
        `UPDATE shift_runs
         SET status = 'CLOSED',
             closed_by_user_id = ?,
             closed_by_name = ?,
             closed_at = CURRENT_TIMESTAMP,
             expected_cash = ?,
             counted_cash = ?,
             variance = ?,
             close_note = ?,
             version = version + 1
         WHERE shift_run_id = ?
           AND version = ?`,
        [
          input.actor.userId,
          input.actor.name,
          summary.expectedCash,
          countedCash,
          variance,
          input.note ?? null,
          input.shiftRunId,
          currentVersion,
        ],
      );
      if (!updateResult?.affectedRows) throw new Error("SHIFT_STALE");

      await conn.query(
        `DELETE FROM shift_cash_breakdowns
         WHERE shift_run_id = ?
           AND type = 'COUNTED'`,
        [input.shiftRunId],
      );

      for (const item of countedBreakdown) {
        await conn.query(
          `INSERT INTO shift_cash_breakdowns (
             shift_run_id,
             type,
             denomination,
             quantity,
             amount
           ) VALUES (?, 'COUNTED', ?, ?, ?)`,
          [input.shiftRunId, item.denomination, item.quantity, item.amount],
        );
      }

      await conn.commit();

      const [freshRows]: any = await pool.query(
        `SELECT * FROM shift_runs WHERE shift_run_id = ? LIMIT 1`,
        [input.shiftRunId],
      );
      return hydrateShift(pool, freshRows[0]);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
