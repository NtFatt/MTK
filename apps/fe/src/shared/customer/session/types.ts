/**
 * Customer (table) session — not to be mixed with internal auth.
 */

export type CustomerSession = {
  sessionKey: string;
  branchId?: number | string;
  tableCode?: string;
  tableId?: string;
  directionId?: string;
  sessionId?: string;
  openedAt?: string;
  expiresAt?: number;
};
