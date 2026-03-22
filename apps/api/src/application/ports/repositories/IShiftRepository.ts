import type { ShiftCode, ShiftTemplateDefinition } from "../../../domain/shifts/templates.js";

export type ShiftBreakdownInput = {
  denomination: number;
  quantity: number;
};

export type ShiftBreakdownRow = ShiftBreakdownInput & {
  amount: number;
};

export type ShiftStatus =
  | "OPEN"
  | "CLOSING_REVIEW"
  | "CLOSED"
  | "FORCE_CLOSED"
  | "CANCELLED";

export type ShiftSummary = {
  openingFloat: number;
  cashSales: number;
  nonCashSales: number;
  cashIn: number;
  cashOut: number;
  refunds: number;
  expectedCash: number;
  unpaidCount: number;
  paidOrderCount: number;
  lastPaymentAt: string | null;
};

export type ShiftRunView = {
  shiftRunId: string;
  branchId: string;
  businessDate: string;
  shiftCode: ShiftCode;
  shiftName: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  status: ShiftStatus;
  openedByUserId: string;
  openedByName: string;
  closedByUserId: string | null;
  closedByName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  openingNote: string | null;
  closeNote: string | null;
  version: number;
  openingBreakdown: ShiftBreakdownRow[];
  countedBreakdown: ShiftBreakdownRow[];
  summary: ShiftSummary;
};

export interface IShiftRepository {
  listTemplates(branchId: string): Promise<ShiftTemplateDefinition[]>;
  getCurrent(branchId: string): Promise<ShiftRunView | null>;
  listHistory(input: { branchId: string; limit: number }): Promise<ShiftRunView[]>;
  openShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    openingFloat: number;
    openingBreakdown: ShiftBreakdownInput[];
    note?: string | null;
    actor: { userId: string; name: string };
  }): Promise<ShiftRunView>;
  closeShift(input: {
    shiftRunId: string;
    branchId: string;
    countedBreakdown: ShiftBreakdownInput[];
    note?: string | null;
    expectedVersion?: number | null;
    actor: { userId: string; name: string };
  }): Promise<ShiftRunView>;
}
