import type { Request, Response } from "express";
import { z } from "zod";
import type { ListStaffUsers } from "../../../application/use-cases/admin/staff/ListStaffUsers.js";
import type { CreateStaffUser } from "../../../application/use-cases/admin/staff/CreateStaffUser.js";
import type { UpdateStaffRole } from "../../../application/use-cases/admin/staff/UpdateStaffRole.js";
import type { UpdateStaffStatus } from "../../../application/use-cases/admin/staff/UpdateStaffStatus.js";
import type { ResetStaffPassword } from "../../../application/use-cases/admin/staff/ResetStaffPassword.js";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";

const CreateBody = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(4).max(200),
  role: z.enum(["BRANCH_MANAGER", "STAFF", "KITCHEN", "CASHIER"]).default("STAFF"),
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform((v) => String(v)),
  fullName: z.string().max(120).nullable().optional().default(null),
});

const ListQuery = z.object({
  branchId: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : String(v))),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

const RoleBody = z.object({
  role: z.enum(["BRANCH_MANAGER", "STAFF", "KITCHEN", "CASHIER"]),
});

const StatusBody = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

const ResetPassBody = z.object({
  newPassword: z.string().min(4).max(200),
});

export class AdminStaffController {
  constructor(
    private readonly listUc: ListStaffUsers,
    private readonly createUc: CreateStaffUser,
    private readonly updateRoleUc: UpdateStaffRole,
    private readonly updateStatusUc: UpdateStaffStatus,
    private readonly resetPassUc: ResetStaffPassword,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  private actorFrom(res: Response) {
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

  list = async (req: Request, res: Response) => {
    const q = ListQuery.parse(req.query);
    const actor = this.actorFrom(res);

    const rows = await this.listUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: q.branchId ?? null,
      status: q.status ?? null,
    });

    return res.json({ items: rows });
  };

  create = async (req: Request, res: Response) => {
    const body = CreateBody.parse(req.body);
    const actor = this.actorFrom(res);

    const created = await this.createUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      username: body.username,
      password: body.password,
      role: body.role,
      branchId: body.branchId,
      fullName: body.fullName ?? null,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "staff.create",
      entity: "staff_users",
      entityId: created.staffId,
      payload: {
        createdUsername: created.username,
        role: created.role,
        branchId: created.branchId,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(created);
  };

  updateRole = async (req: Request, res: Response) => {
    const body = RoleBody.parse(req.body);
    const staffId = String(req.params.staffId);
    const actor = this.actorFrom(res);

    const out = await this.updateRoleUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      staffId,
      role: body.role,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "staff.role.update",
      entity: "staff_users",
      entityId: staffId,
      payload: { newRole: body.role, ip: req.ip, userAgent: req.header("user-agent") ?? null },
    });

    return res.json(out);
  };

  updateStatus = async (req: Request, res: Response) => {
    const body = StatusBody.parse(req.body);
    const staffId = String(req.params.staffId);
    const actor = this.actorFrom(res);

    const out = await this.updateStatusUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      staffId,
      status: body.status,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "staff.status.update",
      entity: "staff_users",
      entityId: staffId,
      payload: { status: body.status, ip: req.ip, userAgent: req.header("user-agent") ?? null },
    });

    return res.json(out);
  };

  resetPassword = async (req: Request, res: Response) => {
    const body = ResetPassBody.parse(req.body);
    const staffId = String(req.params.staffId);
    const actor = this.actorFrom(res);

    const out = await this.resetPassUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      staffId,
      newPassword: body.newPassword,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "staff.password.reset",
      entity: "staff_users",
      entityId: staffId,
      payload: { ip: req.ip, userAgent: req.header("user-agent") ?? null },
    });

    return res.json(out);
  };
}
