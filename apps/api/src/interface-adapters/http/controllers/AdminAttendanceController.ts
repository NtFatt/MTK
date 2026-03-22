import type { Request, Response } from "express";
import { z } from "zod";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";
import type { ListAttendanceBoard } from "../../../application/use-cases/admin/attendance/ListAttendanceBoard.js";
import type { ListStaffAttendanceHistory } from "../../../application/use-cases/admin/attendance/ListStaffAttendanceHistory.js";
import type { ManualAttendanceCheckIn } from "../../../application/use-cases/admin/attendance/ManualAttendanceCheckIn.js";
import type { ManualAttendanceCheckOut } from "../../../application/use-cases/admin/attendance/ManualAttendanceCheckOut.js";
import type { MarkAttendanceAbsent } from "../../../application/use-cases/admin/attendance/MarkAttendanceAbsent.js";

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const BoardQuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  businessDate: DateOnly,
  shiftCode: z.enum(["MORNING", "EVENING"]).optional(),
  role: z.enum(["BRANCH_MANAGER", "STAFF", "KITCHEN", "CASHIER"]).optional(),
  status: z
    .enum([
      "NOT_CHECKED_IN",
      "PRESENT",
      "LATE",
      "EARLY_LEAVE",
      "MISSING_CHECKOUT",
      "ABSENT",
      "ON_LEAVE",
      "CORRECTED",
    ])
    .optional(),
  q: z.string().max(120).optional(),
});

const HistoryQuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

const CheckInBodySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  businessDate: DateOnly,
  shiftCode: z.enum(["MORNING", "EVENING"]),
  performedAt: z.string().min(1),
  note: z.string().trim().min(2).max(1000),
});

const CheckOutBodySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  performedAt: z.string().min(1),
  note: z.string().trim().min(2).max(1000),
  expectedVersion: z.coerce.number().int().positive().optional(),
});

const MarkAbsentBodySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  businessDate: DateOnly,
  shiftCode: z.enum(["MORNING", "EVENING"]),
  note: z.string().trim().min(2).max(1000),
});

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  username: string;
  role: string;
  branchId: string | null;
};

function resolveDefaultShiftCode(): "MORNING" | "EVENING" {
  return new Date().getHours() < 16 ? "MORNING" : "EVENING";
}

export class AdminAttendanceController {
  constructor(
    private readonly listBoardUc: ListAttendanceBoard,
    private readonly listStaffHistoryUc: ListStaffAttendanceHistory,
    private readonly manualCheckInUc: ManualAttendanceCheckIn,
    private readonly manualCheckOutUc: ManualAttendanceCheckOut,
    private readonly markAbsentUc: MarkAttendanceAbsent,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  private actorFrom(res: Response): InternalActor {
    const internal = (res.locals as any).internal;
    if (!internal) throw new Error("INVALID_TOKEN");
    return {
      actorType: internal.actorType,
      actorId: String(internal.userId ?? internal.sub ?? ""),
      username: String(internal.username ?? ""),
      role: String(internal.role ?? ""),
      branchId: internal.branchId != null ? String(internal.branchId) : null,
    };
  }

  private assertBranchAccess(actor: InternalActor, branchId: string) {
    if (actor.actorType !== "STAFF") return;
    if (!actor.branchId || String(actor.branchId) !== String(branchId)) {
      throw new Error("FORBIDDEN");
    }
  }

  board = async (req: Request, res: Response) => {
    const query = BoardQuerySchema.parse(req.query);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, query.branchId);

    const out = await this.listBoardUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: query.branchId,
      businessDate: query.businessDate,
      shiftCode: query.shiftCode ?? resolveDefaultShiftCode(),
      role: query.role ?? null,
      status: query.status ?? null,
      q: query.q ?? null,
    });
    return res.json(out);
  };

  staffHistory = async (req: Request, res: Response) => {
    const query = HistoryQuerySchema.parse(req.query);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, query.branchId);
    const staffId = String(req.params.staffId ?? "").trim();
    if (!staffId) throw new Error("STAFF_ID_REQUIRED");

    const items = await this.listStaffHistoryUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: query.branchId,
      staffId,
      limit: query.limit ?? 12,
    });
    return res.json({ items });
  };

  manualCheckIn = async (req: Request, res: Response) => {
    const staffId = String(req.params.staffId ?? "").trim();
    if (!staffId) throw new Error("STAFF_ID_REQUIRED");

    const body = CheckInBodySchema.parse(req.body);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, body.branchId);

    const record = await this.manualCheckInUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
        username: actor.username,
      },
      branchId: body.branchId,
      staffId,
      businessDate: body.businessDate,
      shiftCode: body.shiftCode,
      performedAt: body.performedAt,
      note: body.note,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "attendance.checkin.manual",
      entity: "attendance_records",
      entityId: record.attendanceId,
      payload: {
        branchId: record.branchId,
        staffId: record.staffId,
        businessDate: record.businessDate,
        shiftCode: record.shiftCode,
        note: body.note,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(record);
  };

  manualCheckOut = async (req: Request, res: Response) => {
    const attendanceId = String(req.params.attendanceId ?? "").trim();
    if (!attendanceId) throw new Error("ATTENDANCE_ID_REQUIRED");

    const body = CheckOutBodySchema.parse(req.body);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, body.branchId);

    const record = await this.manualCheckOutUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
        username: actor.username,
      },
      branchId: body.branchId,
      attendanceId,
      performedAt: body.performedAt,
      note: body.note,
      expectedVersion: body.expectedVersion ?? null,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "attendance.checkout.manual",
      entity: "attendance_records",
      entityId: record.attendanceId,
      payload: {
        branchId: record.branchId,
        staffId: record.staffId,
        businessDate: record.businessDate,
        shiftCode: record.shiftCode,
        note: body.note,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(record);
  };

  markAbsent = async (req: Request, res: Response) => {
    const staffId = String(req.params.staffId ?? "").trim();
    if (!staffId) throw new Error("STAFF_ID_REQUIRED");

    const body = MarkAbsentBodySchema.parse(req.body);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, body.branchId);

    const record = await this.markAbsentUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
        username: actor.username,
      },
      branchId: body.branchId,
      staffId,
      businessDate: body.businessDate,
      shiftCode: body.shiftCode,
      note: body.note,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "attendance.absent.manual",
      entity: "attendance_records",
      entityId: record.attendanceId,
      payload: {
        branchId: record.branchId,
        staffId: record.staffId,
        businessDate: record.businessDate,
        shiftCode: record.shiftCode,
        note: body.note,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(record);
  };
}
