export type TableStatusCounts = {
  AVAILABLE: number;
  RESERVED: number;
  OCCUPIED: number;
  OUT_OF_SERVICE: number;
};

export type MaintenanceRunResult = {
  now: string;
  expiredPendingReservations: number;
  markedNoShowReservations: number;
  completedReservations: number;
  closedStaleSessions: number;
  tableStatus: TableStatusCounts;
};

export type DevResetResult = {
  updatedTables: number;
  closedOpenSessions: number;
  canceledReservations: number;
  // Optional: deterministic demo restock (DEV-only) to make smoke consistent.
  restockedBranchId?: string;
  restockedQty?: number;
  restockedStockRows?: number;
  syncedMenuItemsStockQty?: number;
};

export type DevSetStockResult = {
  branchId: string;
  itemId: string;
  quantity: number;
  updatedStockRows: number;
  updatedMenuItems: number;
};

/**
 * Maintenance repository provides DB-level operations that span multiple aggregates.
 *
 * Goals:
 * - Make the system self-healing for edge-cases (status stuck, retries, missing UI transitions)
 * - Provide deterministic, idempotent operations that can be executed by background jobs or admin endpoint.
 */
export interface IMaintenanceRepository {
  expirePendingReservations(now: Date): Promise<number>;

  /**
   * Mark reservations as NO_SHOW after reserved_from + graceMinutes, when still CONFIRMED.
   */
  markNoShowReservations(now: Date, graceMinutes: number): Promise<number>;

  /**
   * Mark CHECKED_IN reservations as COMPLETED when their linked session is CLOSED.
   */
  completeCheckedInReservations(now: Date): Promise<number>;

  /**
   * Close stale OPEN sessions that have no active cart and no in-progress orders.
   */
  closeStaleSessions(now: Date, staleMinutes: number): Promise<number>;

  /**
   * Canonical table_status sync to avoid RESERVED/OCCUPIED stuck.
   */
  syncTableStatuses(now: Date, lockAheadMinutes: number, branchId?: string | null): Promise<TableStatusCounts>;

  /**
   * DEV-ONLY: Hard reset state for local smoke/demo.
   * - restaurant_tables: AVAILABLE (except OUT_OF_SERVICE)
   * - table_sessions: force CLOSE all OPEN
   * - table_reservations: cancel PENDING/CONFIRMED/CHECKED_IN
   */
  resetDevState(
    now: Date,
    branchId?: string | null,
    opts?: { restock?: boolean; restockQty?: number }
  ): Promise<DevResetResult>;

  /**
   * DEV-ONLY: force stock for one menu item in one branch (used by deterministic smoke).
   *
   * IMPORTANT: this only updates MySQL SoT.
   * Redis keys (stock/reserved + holds cleanup) are handled by the use-case.
   */
  setDevStock(branchId: string, itemId: string, quantity: number): Promise<DevSetStockResult>;
}
