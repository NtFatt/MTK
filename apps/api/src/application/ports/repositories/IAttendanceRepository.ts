import type { ShiftCode } from "../../../domain/shifts/templates.js";

export type AttendanceStatus =
  | "NOT_CHECKED_IN"
  | "PRESENT"
  | "LATE"
  | "EARLY_LEAVE"
  | "MISSING_CHECKOUT"
  | "ABSENT"
  | "ON_LEAVE"
  | "CORRECTED";

export type AttendanceSource =
  | "SELF"
  | "MANAGER_MANUAL"
  | "AUTO_FROM_SHIFT"
  | "CORRECTION";

export type AttendanceActorRef = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  actorName: string;
};

export type AttendanceRecordView = {
  attendanceId: string;
  branchId: string;
  staffId: string;
  staffName: string | null;
  username: string;
  staffRole: string;
  staffStatus: string;
  businessDate: string;
  shiftCode: ShiftCode;
  shiftName: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  scheduledStartAt: string;
  scheduledEndAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  source: AttendanceSource;
  note: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number | null;
  isCorrected: boolean;
  lastCorrectedAt: string | null;
  lastCorrectedByType: string | null;
  lastCorrectedById: string | null;
  version: number;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceBoardRow = Omit<AttendanceRecordView, "attendanceId" | "source" | "version"> & {
  rowKey: string;
  attendanceId: string | null;
  source: AttendanceSource | null;
  version: number | null;
  isPlaceholder: boolean;
};

export interface IAttendanceRepository {
  listRecordsForShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
  }): Promise<AttendanceRecordView[]>;

  getById(input: { branchId: string; attendanceId: string }): Promise<AttendanceRecordView | null>;

  listStaffHistory(input: {
    branchId: string;
    staffId: string;
    limit: number;
  }): Promise<AttendanceRecordView[]>;

  findByStaffShift(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
  }): Promise<AttendanceRecordView | null>;

  findOpenByStaff(input: { branchId: string; staffId: string }): Promise<AttendanceRecordView | null>;

  manualCheckIn(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    performedAt: string;
    note: string;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView>;

  manualCheckOut(input: {
    branchId: string;
    attendanceId: string;
    performedAt: string;
    note: string;
    expectedVersion?: number | null;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView>;

  markAbsent(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    note: string;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView>;

  autoCheckInFromShift(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    performedAt: string;
    actor: AttendanceActorRef;
  }): Promise<AttendanceRecordView | null>;

  autoCheckOutOpenRecords(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    performedAt: string;
    actor: AttendanceActorRef;
  }): Promise<number>;
}
