import type { Request, Response } from "express";
import { z } from "zod";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";
import type { ListBranchVouchers } from "../../../application/use-cases/admin/voucher/ListBranchVouchers.js";
import type { CreateVoucher } from "../../../application/use-cases/admin/voucher/CreateVoucher.js";
import type { UpdateVoucher } from "../../../application/use-cases/admin/voucher/UpdateVoucher.js";
import type { SetVoucherActive } from "../../../application/use-cases/admin/voucher/SetVoucherActive.js";

const DiscountTypeSchema = z.enum(["PERCENT", "FIXED_AMOUNT"]);

const ListQuery = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).optional().transform((value) => (value == null ? undefined : String(value))),
  q: z.string().trim().max(100).optional(),
  includeInactive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value !== "false";
      return true;
    }),
});

const CreateBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  code: z.string().trim().min(3).max(40),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(255).optional().transform((value) => (value ? value : null)),
  discountType: DiscountTypeSchema,
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().positive().nullable().optional().transform((value) => value ?? null),
  minSubtotal: z.number().min(0),
  usageLimitTotal: z.number().int().positive().nullable().optional().transform((value) => value ?? null),
  usageLimitPerSession: z.number().int().positive().nullable().optional().transform((value) => value ?? null),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().optional().default(true),
});

const UpdateBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  code: z.string().trim().min(3).max(40).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(255).nullable().optional(),
  discountType: DiscountTypeSchema.optional(),
  discountValue: z.number().positive().optional(),
  maxDiscountAmount: z.number().positive().nullable().optional(),
  minSubtotal: z.number().min(0).optional(),
  usageLimitTotal: z.number().int().positive().nullable().optional(),
  usageLimitPerSession: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

const ActiveBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  isActive: z.boolean(),
});

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  username: string;
  role: string;
  branchId: string | null;
};

export class AdminVoucherController {
  constructor(
    private readonly listVouchersUc: ListBranchVouchers,
    private readonly createVoucherUc: CreateVoucher,
    private readonly updateVoucherUc: UpdateVoucher,
    private readonly setVoucherActiveUc: SetVoucherActive,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  private actorFrom(res: Response): InternalActor {
    const internal = (res.locals as any).internal;
    if (!internal) throw new Error("INVALID_TOKEN");
    return {
      actorType: internal.actorType,
      actorId: internal.userId,
      username: internal.username,
      role: internal.role,
      branchId: internal.branchId ?? null,
    };
  }

  private resolveBranchId(actor: InternalActor, requestedBranchId?: string | null) {
    const mustUseOwnBranch =
      actor.actorType === "STAFF" ||
      actor.role === "STAFF" ||
      actor.role === "BRANCH_MANAGER";

    if (mustUseOwnBranch) {
      if (!actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      return String(actor.branchId);
    }

    const branchId = requestedBranchId ?? actor.branchId ?? null;
    if (!branchId) throw new Error("BRANCH_REQUIRED");
    return String(branchId);
  }

  list = async (req: Request, res: Response) => {
    const query = ListQuery.parse(req.query);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, query.branchId ?? null);

    const items = await this.listVouchersUc.execute({
      branchId,
      q: query.q ?? null,
      includeInactive: query.includeInactive,
    });

    return res.json({ items });
  };

  create = async (req: Request, res: Response) => {
    const body = CreateBody.parse(req.body);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, body.branchId);

    const created = await this.createVoucherUc.execute({
      branchId,
      code: body.code,
      name: body.name,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      maxDiscountAmount: body.maxDiscountAmount,
      minSubtotal: body.minSubtotal,
      usageLimitTotal: body.usageLimitTotal,
      usageLimitPerSession: body.usageLimitPerSession,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      isActive: body.isActive,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "voucher.create",
      entity: "vouchers",
      entityId: created.id,
      payload: {
        branchId,
        code: created.code,
        name: created.name,
        discountType: created.discountType,
        discountValue: created.discountValue,
        minSubtotal: created.minSubtotal,
        usageLimitTotal: created.usageLimitTotal,
        usageLimitPerSession: created.usageLimitPerSession,
        startsAt: created.startsAt,
        endsAt: created.endsAt,
        isActive: created.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(created);
  };

  update = async (req: Request, res: Response) => {
    const body = UpdateBody.parse(req.body);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, body.branchId);
    const voucherId = String(req.params.voucherId);
    const payload: Parameters<UpdateVoucher["execute"]>[0] = {
      voucherId,
      branchId,
    };

    if (body.code !== undefined) payload.code = body.code;
    if (body.name !== undefined) payload.name = body.name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.discountType !== undefined) payload.discountType = body.discountType;
    if (body.discountValue !== undefined) payload.discountValue = body.discountValue;
    if (body.maxDiscountAmount !== undefined) payload.maxDiscountAmount = body.maxDiscountAmount;
    if (body.minSubtotal !== undefined) payload.minSubtotal = body.minSubtotal;
    if (body.usageLimitTotal !== undefined) payload.usageLimitTotal = body.usageLimitTotal;
    if (body.usageLimitPerSession !== undefined) {
      payload.usageLimitPerSession = body.usageLimitPerSession;
    }
    if (body.startsAt !== undefined) payload.startsAt = body.startsAt;
    if (body.endsAt !== undefined) payload.endsAt = body.endsAt;
    if (body.isActive !== undefined) payload.isActive = body.isActive;

    const updated = await this.updateVoucherUc.execute(payload);

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "voucher.update",
      entity: "vouchers",
      entityId: updated.id,
      payload: {
        branchId,
        code: updated.code,
        name: updated.name,
        discountType: updated.discountType,
        discountValue: updated.discountValue,
        minSubtotal: updated.minSubtotal,
        usageLimitTotal: updated.usageLimitTotal,
        usageLimitPerSession: updated.usageLimitPerSession,
        startsAt: updated.startsAt,
        endsAt: updated.endsAt,
        isActive: updated.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(updated);
  };

  setActive = async (req: Request, res: Response) => {
    const body = ActiveBody.parse(req.body);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, body.branchId);
    const voucherId = String(req.params.voucherId);

    const updated = await this.setVoucherActiveUc.execute({
      voucherId,
      branchId,
      isActive: body.isActive,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: body.isActive ? "voucher.activate" : "voucher.deactivate",
      entity: "vouchers",
      entityId: updated.id,
      payload: {
        branchId,
        code: updated.code,
        isActive: updated.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(updated);
  };
}
