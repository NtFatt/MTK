import type { ShiftCode } from "../../../domain/shifts/templates.js";

export type StaffShiftAssignmentActorRef = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  actorName: string;
};

export type StaffShiftAssignmentView = {
  assignmentId: string;
  branchId: string;
  staffId: string;
  businessDate: string;
  shiftCode: ShiftCode;
  shiftName: string;
  assignedByActorType: "ADMIN" | "STAFF" | null;
  assignedById: string | null;
  assignedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface IStaffShiftAssignmentRepository {
  listForDate(input: { branchId: string; businessDate: string }): Promise<StaffShiftAssignmentView[]>;

  listForStaffDate(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
  }): Promise<StaffShiftAssignmentView[]>;

  listForShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
  }): Promise<StaffShiftAssignmentView[]>;

  findForStaffShift(input: {
    branchId: string;
    staffId: string;
    businessDate: string;
    shiftCode: ShiftCode;
  }): Promise<StaffShiftAssignmentView | null>;

  upsertAssignments(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
    actor: StaffShiftAssignmentActorRef;
  }): Promise<StaffShiftAssignmentView[]>;

  replaceAssignmentsForShift(input: {
    branchId: string;
    businessDate: string;
    shiftCode: ShiftCode;
    staffIds: string[];
    actor: StaffShiftAssignmentActorRef;
  }): Promise<StaffShiftAssignmentView[]>;
}
