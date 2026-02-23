import type {
  DevResetResult,
  DevSetStockResult,
  IMaintenanceRepository,
  TableStatusCounts,
} from "../../../../application/ports/repositories/IMaintenanceRepository.js";
import { pool } from "../connection.js";

function emptyCounts(): TableStatusCounts {
  return { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, OUT_OF_SERVICE: 0 };
}

export class MySQLMaintenanceRepository implements IMaintenanceRepository {
  async expirePendingReservations(now: Date): Promise<number> {
    const [result]: any = await pool.query(
      `UPDATE table_reservations
       SET status = 'EXPIRED'
       WHERE status = 'PENDING'
         AND expires_at IS NOT NULL
         AND expires_at <= ?`,
      [now],
    );
    return Number(result?.affectedRows ?? 0);
  }

  async markNoShowReservations(now: Date, graceMinutes: number): Promise<number> {
    // Rule: after reserved_from + graceMinutes, still CONFIRMED => NO_SHOW
    const [result]: any = await pool.query(
      `UPDATE table_reservations
       SET status = 'NO_SHOW'
       WHERE status = 'CONFIRMED'
         AND DATE_ADD(reserved_from, INTERVAL ? MINUTE) <= ?`,
      [graceMinutes, now],
    );
    return Number(result?.affectedRows ?? 0);
  }

  async completeCheckedInReservations(now: Date): Promise<number> {
    // Rule: CHECKED_IN reservation with CLOSED session => COMPLETED
    const [result]: any = await pool.query(
      `UPDATE table_reservations r
       JOIN table_sessions s ON s.session_id = r.session_id
       SET r.status = 'COMPLETED'
       WHERE r.status = 'CHECKED_IN'
         AND r.session_id IS NOT NULL
         AND s.status = 'CLOSED'
         AND (r.reserved_to <= ? OR r.reserved_from <= ?)
      `,
      [now, now],
    );
    return Number(result?.affectedRows ?? 0);
  }

  async closeStaleSessions(now: Date, staleMinutes: number): Promise<number> {
    // Close only when:
    // - session OPEN
    // - older than staleMinutes
    // - no ACTIVE cart
    // - no in-progress order (anything not final)
    const [result]: any = await pool.query(
      `UPDATE table_sessions s
       SET s.status = 'CLOSED', s.closed_at = ?
       WHERE s.status = 'OPEN'
         AND s.opened_at <= DATE_SUB(?, INTERVAL ? MINUTE)
         AND NOT EXISTS (
           SELECT 1 FROM carts c
           WHERE c.session_id = s.session_id
             AND c.cart_status = 'ACTIVE'
         )
         AND NOT EXISTS (
           SELECT 1 FROM orders o
           WHERE o.session_id = s.session_id
             AND o.order_status NOT IN ('PAID','COMPLETED','CANCELED')
         )`,
      [now, now, staleMinutes],
    );
    return Number(result?.affectedRows ?? 0);
  }

  async syncTableStatuses(now: Date, lockAheadMinutes: number, branchId?: string | null): Promise<TableStatusCounts> {
    // Canonical policy:
    // - OUT_OF_SERVICE stays OUT_OF_SERVICE
    // - If there is any OPEN session => OCCUPIED
    // - Else if there is an active reservation that starts soon (<= lockAheadMinutes) => RESERVED
    // - Else AVAILABLE

    const branchWhere = branchId ? "AND t.branch_id = ?" : "";
    const args: any[] = [];
    if (branchId) args.push(branchId);

    await pool.query(
      `UPDATE restaurant_tables t
       SET t.table_status = CASE
         WHEN t.table_status = 'OUT_OF_SERVICE' THEN 'OUT_OF_SERVICE'
         WHEN EXISTS (
           SELECT 1 FROM table_sessions s
           WHERE s.table_id = t.table_id
             AND s.status = 'OPEN'
         ) THEN 'OCCUPIED'
         WHEN EXISTS (
           SELECT 1 FROM table_reservations r
           WHERE r.table_id = t.table_id
             AND r.status IN ('PENDING','CONFIRMED','CHECKED_IN')
             AND (r.status <> 'PENDING' OR (r.expires_at IS NULL OR r.expires_at > ?))
             AND r.reserved_from <= DATE_ADD(?, INTERVAL ? MINUTE)
             AND r.reserved_to >= ?
         ) THEN 'RESERVED'
         ELSE 'AVAILABLE'
       END
       WHERE t.table_id IS NOT NULL ${branchWhere}`,
      branchId
        ? [now, now, lockAheadMinutes, now, ...args]
        : [now, now, lockAheadMinutes, now],
    );

    const [rows]: any = await pool.query(
      `SELECT table_status, COUNT(*) AS c
       FROM restaurant_tables t
       WHERE 1=1 ${branchWhere}
       GROUP BY table_status`,
      args,
    );

    const out = emptyCounts();
    for (const r of rows ?? []) {
      const k = String(r.table_status);
      if (k in out) (out as any)[k] = Number(r.c ?? 0);
    }
    return out;
  }

  async resetDevState(
    now: Date,
    branchId?: string | null,
    opts?: { restock?: boolean; restockQty?: number },
  ): Promise<DevResetResult> {
    // Ensure required demo baseline exists so smoke/negative packs are deterministic.
    // Why: NEG-03 (Branch mismatch) requires at least 2 branches (1 and 999) with tables.
    // This is safe for dev reset because it uses idempotent upserts.
    try {
      await pool.query(
        `INSERT INTO branches(branch_id, branch_code, branch_name, address, phone, timezone, is_active, open_time, close_time)
         VALUES
           (1,'HCM1','Haidilao HCM - Demo','Demo Address, Ho Chi Minh City','0900000000','Asia/Ho_Chi_Minh',1,'09:00:00','22:00:00'),
           (999,'HCM999','Haidilao HCM - Demo Branch 999','Demo Address, Ho Chi Minh City','0900000999','Asia/Ho_Chi_Minh',1,'09:00:00','22:00:00')
         ON DUPLICATE KEY UPDATE
           branch_code=VALUES(branch_code),
           branch_name=VALUES(branch_name),
           address=VALUES(address),
           phone=VALUES(phone),
           timezone=VALUES(timezone),
           is_active=VALUES(is_active),
           open_time=VALUES(open_time),
           close_time=VALUES(close_time)`,
      );

      await pool.query(
        `INSERT INTO restaurant_tables(branch_id, table_code, area_name, seats, table_status)
         VALUES
           (1,'A01','Zone A',4,'AVAILABLE'),
           (1,'A02','Zone A',4,'AVAILABLE'),
           (1,'B01','Zone B',6,'AVAILABLE'),
           (999,'Z01','Zone Z',4,'AVAILABLE'),
           (999,'Z02','Zone Z',4,'AVAILABLE')
         ON DUPLICATE KEY UPDATE
           table_status=VALUES(table_status),
           seats=VALUES(seats),
           area_name=VALUES(area_name)`,
      );
    } catch {
      // Best-effort. Even if baseline upsert fails due to schema drift,
      // we still proceed with reset for existing data.
    }

    // DEV-only hard reset. Guard is enforced at controller/use-case layer.
    const args: any[] = [];
    const branchWhere = branchId ? "AND branch_id = ?" : "";
    if (branchId) args.push(branchId);

    const [r1]: any = await pool.query(
      `UPDATE restaurant_tables
       SET table_status = 'AVAILABLE'
       WHERE table_id IS NOT NULL
         AND table_status <> 'OUT_OF_SERVICE' ${branchWhere}`,
      args,
    );

    const [r2]: any = await pool.query(
      `UPDATE table_sessions
       SET status = 'CLOSED', closed_at = ?
       WHERE session_id IS NOT NULL
         AND status = 'OPEN' ${branchWhere}`,
      branchId ? [now, ...args] : [now],
    );

    const [r3]: any = await pool.query(
      `UPDATE table_reservations
       SET status = 'CANCELED', canceled_at = ?
       WHERE reservation_id IS NOT NULL
         AND status IN ('PENDING','CONFIRMED','CHECKED_IN') ${branchWhere}`,
      branchId ? [now, ...args] : [now],
    );

    // Optional deterministic restock for local smoke/demo.
    // This aligns the legacy `menu_items.stock_qty` (UI) with the SoT `menu_item_stock.quantity` (inventory engine).
    let restockedBranchId: string | undefined;
    let restockedQty: number | undefined;
    let restockedStockRows: number | undefined;
    let syncedMenuItemsStockQty: number | undefined;

    if (opts?.restock) {
      const qty = Number.isFinite(Number(opts.restockQty)) && Number(opts.restockQty) >= 0
        ? Math.floor(Number(opts.restockQty))
        : 100;

      // Resolve branch: prefer explicit branchId; else take first branch.
      if (branchId) {
        restockedBranchId = String(branchId);
      } else {
        const [bRows]: any = await pool.query(
          `SELECT branch_id AS id FROM branches ORDER BY branch_id ASC LIMIT 1`,
        );
        const id = bRows?.[0]?.id;
        if (id !== undefined && id !== null) restockedBranchId = String(id);
      }

      if (restockedBranchId) {
        const [s1]: any = await pool.query(
          `INSERT INTO menu_item_stock (branch_id, item_id, quantity, last_restock_at)
           SELECT ?, mi.item_id, ?, NOW()
           FROM menu_items mi
           WHERE mi.is_active = 1
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), last_restock_at = VALUES(last_restock_at)`,
          [restockedBranchId, qty],
        );
        restockedStockRows = Number(s1?.affectedRows ?? 0);

        const [s2]: any = await pool.query(
          `UPDATE menu_items
           SET stock_qty = ?
           WHERE item_id IS NOT NULL AND is_active = 1`,
          [qty],
        );
        syncedMenuItemsStockQty = Number(s2?.affectedRows ?? 0);
        restockedQty = qty;
      }
    }

    return {
      updatedTables: Number(r1?.affectedRows ?? 0),
      closedOpenSessions: Number(r2?.affectedRows ?? 0),
      canceledReservations: Number(r3?.affectedRows ?? 0),
      ...(restockedBranchId ? { restockedBranchId } : {}),
      ...(restockedQty !== undefined ? { restockedQty } : {}),
      ...(restockedStockRows !== undefined ? { restockedStockRows } : {}),
      ...(syncedMenuItemsStockQty !== undefined ? { syncedMenuItemsStockQty } : {}),
    };
  }

  async setDevStock(branchId: string, itemId: string, quantity: number): Promise<DevSetStockResult> {
    const b = String(branchId);
    const i = String(itemId);
    const q = Number.isFinite(Number(quantity)) ? Math.max(0, Math.floor(Number(quantity))) : 0;

    // SoT: per-branch stock
    const [s1]: any = await pool.query(
      `INSERT INTO menu_item_stock (branch_id, item_id, quantity, last_restock_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), last_restock_at = VALUES(last_restock_at)`,
      [b, i, q],
    );

    // Legacy/UI: menu_items.stock_qty (kept in sync for menu list)
    const [s2]: any = await pool.query(
      `UPDATE menu_items
       SET stock_qty = ?
       WHERE item_id = ?`,
      [q, i],
    );

    return {
      branchId: b,
      itemId: i,
      quantity: q,
      updatedStockRows: Number(s1?.affectedRows ?? 0),
      updatedMenuItems: Number(s2?.affectedRows ?? 0),
    };
  }
}
