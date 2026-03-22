import type { Request, Response } from "express";
import { z } from "zod";
import type { GetCurrentShift } from "../../../application/use-cases/admin/shifts/GetCurrentShift.js";
import type { ListShiftHistory } from "../../../application/use-cases/admin/shifts/ListShiftHistory.js";
import type { OpenShift } from "../../../application/use-cases/admin/shifts/OpenShift.js";
import type { CloseShift } from "../../../application/use-cases/admin/shifts/CloseShift.js";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const BreakdownItemSchema = z.object({
  denomination: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0),
});

const CurrentQuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
});

const HistoryQuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const OpenShiftBodySchema = z.object({
  businessDate: DateOnly,
  shiftCode: z.enum(["MORNING", "EVENING"]),
  openingFloat: z.coerce.number().int().min(0),
  openingBreakdown: z.array(BreakdownItemSchema).default([]),
  note: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null) return null;
      const text = value.trim();
      return text.length ? text : null;
    }),
});

const CloseShiftBodySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  expectedVersion: z.coerce.number().int().positive().optional(),
  countedBreakdown: z.array(BreakdownItemSchema).default([]),
  note: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null) return null;
      const text = value.trim();
      return text.length ? text : null;
    }),
});

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  username: string;
  role: string;
  branchId: string | null;
};

export class AdminShiftController {
  constructor(
    private readonly getCurrentShiftUc: GetCurrentShift,
    private readonly listShiftHistoryUc: ListShiftHistory,
    private readonly openShiftUc: OpenShift,
    private readonly closeShiftUc: CloseShift,
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

  current = async (req: Request, res: Response) => {
    const query = CurrentQuerySchema.parse(req.query);
    this.assertBranchAccess(this.actorFrom(res), query.branchId);
    const out = await this.getCurrentShiftUc.execute({ branchId: query.branchId });
    return res.json(out);
  };

  history = async (req: Request, res: Response) => {
    const query = HistoryQuerySchema.parse(req.query);
    this.assertBranchAccess(this.actorFrom(res), query.branchId);
    const items = await this.listShiftHistoryUc.execute({
      branchId: query.branchId,
      limit: query.limit ?? 20,
    });
    return res.json({ items });
  };

  open = async (req: Request, res: Response) => {
    const branchId = String(req.params?.branchId ?? "").trim();
    if (!branchId) throw new Error("BRANCH_REQUIRED");
    const body = OpenShiftBodySchema.parse(req.body);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, branchId);

    const created = await this.openShiftUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
        username: actor.username,
      },
      branchId,
      businessDate: body.businessDate,
      shiftCode: body.shiftCode,
      openingFloat: body.openingFloat,
      openingBreakdown: body.openingBreakdown,
      note: body.note,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "shift.open",
      entity: "shift_runs",
      entityId: created.shiftRunId,
      payload: {
        branchId: created.branchId,
        shiftCode: created.shiftCode,
        businessDate: created.businessDate,
        openingFloat: created.openingFloat,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(created);
  };

  close = async (req: Request, res: Response) => {
    const shiftRunId = String(req.params.shiftRunId ?? "").trim();
    if (!shiftRunId) throw new Error("INVALID_SHIFT_RUN_ID");

    const body = CloseShiftBodySchema.parse(req.body);
    const actor = this.actorFrom(res);
    this.assertBranchAccess(actor, body.branchId);

    const closed = await this.closeShiftUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
        username: actor.username,
      },
      shiftRunId,
      branchId: body.branchId,
      countedBreakdown: body.countedBreakdown,
      note: body.note,
      expectedVersion: body.expectedVersion ?? null,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "shift.close",
      entity: "shift_runs",
      entityId: closed.shiftRunId,
      payload: {
        branchId: closed.branchId,
        shiftCode: closed.shiftCode,
        businessDate: closed.businessDate,
        expectedCash: closed.expectedCash,
        countedCash: closed.countedCash,
        variance: closed.variance,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(closed);
  };
}
