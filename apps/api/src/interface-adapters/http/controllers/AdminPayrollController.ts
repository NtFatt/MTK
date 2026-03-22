import type { Request, Response } from "express";
import { z } from "zod";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";
import type { PayrollBonusType, PayrollSalaryMode } from "../../../application/ports/repositories/IPayrollRepository.js";
import type { ListPayrollSummary } from "../../../application/use-cases/admin/payroll/ListPayrollSummary.js";
import type { GetPayrollStaffDetail } from "../../../application/use-cases/admin/payroll/GetPayrollStaffDetail.js";
import type { UpsertPayrollProfile } from "../../../application/use-cases/admin/payroll/UpsertPayrollProfile.js";
import type { CreatePayrollBonus } from "../../../application/use-cases/admin/payroll/CreatePayrollBonus.js";
import type { UpdatePayrollBonus } from "../../../application/use-cases/admin/payroll/UpdatePayrollBonus.js";
import type { VoidPayrollBonus } from "../../../application/use-cases/admin/payroll/VoidPayrollBonus.js";

const MonthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const BranchIdSchema = z.union([z.string().min(1), z.number().int().positive()]).transform(String);
const MoneySchema = z.coerce.number().min(0);
const PositiveMoneySchema = z.coerce.number().positive();
const SalaryModeSchema = z.enum(["MONTHLY", "HOURLY", "SHIFT"]);
const BonusTypeSchema = z.enum(["PERFORMANCE", "ADJUSTMENT", "OTHER"]);

const SummaryQuerySchema = z.object({
  branchId: BranchIdSchema,
  month: MonthSchema,
  q: z.string().trim().max(120).optional(),
});

const DetailQuerySchema = z.object({
  branchId: BranchIdSchema,
  month: MonthSchema,
});

const UpsertProfileBodySchema = z.object({
  branchId: BranchIdSchema,
  salaryMode: SalaryModeSchema,
  baseMonthlyAmount: MoneySchema,
  hourlyRateAmount: MoneySchema,
  shiftRateMorning: MoneySchema,
  shiftRateEvening: MoneySchema,
  latePenaltyPerMinute: MoneySchema,
  earlyLeavePenaltyPerMinute: MoneySchema,
  absencePenaltyAmount: MoneySchema,
  isActive: z.boolean(),
  note: z.string().trim().max(1000).nullable().optional(),
  expectedVersion: z.coerce.number().int().positive().nullable().optional(),
});

const CreateBonusBodySchema = z.object({
  branchId: BranchIdSchema,
  businessDate: DateOnlySchema,
  bonusType: BonusTypeSchema,
  amount: PositiveMoneySchema,
  note: z.string().trim().min(2).max(1000),
});

const UpdateBonusBodySchema = z.object({
  branchId: BranchIdSchema,
  businessDate: DateOnlySchema.optional(),
  bonusType: BonusTypeSchema.optional(),
  amount: PositiveMoneySchema.optional(),
  note: z.string().trim().min(2).max(1000).optional(),
  expectedVersion: z.coerce.number().int().positive().nullable().optional(),
});

const VoidBonusBodySchema = z.object({
  branchId: BranchIdSchema,
  reason: z.string().trim().min(2).max(1000),
  expectedVersion: z.coerce.number().int().positive().nullable().optional(),
});

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  username: string;
  role: string;
  branchId: string | null;
};

export class AdminPayrollController {
  constructor(
    private readonly listSummaryUc: ListPayrollSummary,
    private readonly getStaffDetailUc: GetPayrollStaffDetail,
    private readonly upsertProfileUc: UpsertPayrollProfile,
    private readonly createBonusUc: CreatePayrollBonus,
    private readonly updateBonusUc: UpdatePayrollBonus,
    private readonly voidBonusUc: VoidPayrollBonus,
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

  listSummary = async (req: Request, res: Response) => {
    const query = SummaryQuerySchema.parse(req.query);
    const actor = this.actorFrom(res);
    const items = await this.listSummaryUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: query.branchId,
      month: query.month,
      q: query.q ?? null,
    });

    return res.json({ items });
  };

  staffDetail = async (req: Request, res: Response) => {
    const query = DetailQuerySchema.parse(req.query);
    const actor = this.actorFrom(res);
    const staffId = String(req.params.staffId ?? "").trim();
    if (!staffId) throw new Error("STAFF_ID_REQUIRED");

    const detail = await this.getStaffDetailUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: query.branchId,
      staffId,
      month: query.month,
    });
    if (!detail) throw new Error("STAFF_NOT_FOUND");
    return res.json(detail);
  };

  upsertProfile = async (req: Request, res: Response) => {
    const staffId = String(req.params.staffId ?? "").trim();
    if (!staffId) throw new Error("STAFF_ID_REQUIRED");

    const body = UpsertProfileBodySchema.parse(req.body);
    const actor = this.actorFrom(res);

    const profile = await this.upsertProfileUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: body.branchId,
      staffId,
      salaryMode: body.salaryMode as PayrollSalaryMode,
      baseMonthlyAmount: body.baseMonthlyAmount,
      hourlyRateAmount: body.hourlyRateAmount,
      shiftRateMorning: body.shiftRateMorning,
      shiftRateEvening: body.shiftRateEvening,
      latePenaltyPerMinute: body.latePenaltyPerMinute,
      earlyLeavePenaltyPerMinute: body.earlyLeavePenaltyPerMinute,
      absencePenaltyAmount: body.absencePenaltyAmount,
      isActive: body.isActive,
      note: body.note ?? null,
      expectedVersion: body.expectedVersion ?? null,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "payroll.profile.upsert",
      entity: "payroll_profiles",
      entityId: profile.payrollProfileId,
      payload: {
        branchId: profile.branchId,
        staffId: profile.staffId,
        salaryMode: profile.salaryMode,
        isActive: profile.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(profile);
  };

  createBonus = async (req: Request, res: Response) => {
    const staffId = String(req.params.staffId ?? "").trim();
    if (!staffId) throw new Error("STAFF_ID_REQUIRED");

    const body = CreateBonusBodySchema.parse(req.body);
    const actor = this.actorFrom(res);

    const bonus = await this.createBonusUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
      },
      branchId: body.branchId,
      staffId,
      businessDate: body.businessDate,
      bonusType: body.bonusType as PayrollBonusType,
      amount: body.amount,
      note: body.note,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "payroll.bonus.create",
      entity: "payroll_bonus_entries",
      entityId: bonus.payrollBonusId,
      payload: {
        branchId: bonus.branchId,
        staffId: bonus.staffId,
        businessDate: bonus.businessDate,
        bonusType: bonus.bonusType,
        amount: bonus.amount,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(bonus);
  };

  updateBonus = async (req: Request, res: Response) => {
    const payrollBonusId = String(req.params.payrollBonusId ?? "").trim();
    if (!payrollBonusId) throw new Error("PAYROLL_BONUS_ID_REQUIRED");

    const body = UpdateBonusBodySchema.parse(req.body);
    const actor = this.actorFrom(res);

    const bonus = await this.updateBonusUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
      },
      payrollBonusId,
      branchId: body.branchId,
      ...(body.businessDate != null ? { businessDate: body.businessDate } : {}),
      ...(body.bonusType != null ? { bonusType: body.bonusType as PayrollBonusType } : {}),
      ...(body.amount != null ? { amount: body.amount } : {}),
      ...(body.note != null ? { note: body.note } : {}),
      expectedVersion: body.expectedVersion ?? null,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "payroll.bonus.update",
      entity: "payroll_bonus_entries",
      entityId: bonus.payrollBonusId,
      payload: {
        branchId: bonus.branchId,
        staffId: bonus.staffId,
        businessDate: bonus.businessDate,
        bonusType: bonus.bonusType,
        amount: bonus.amount,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(bonus);
  };

  voidBonus = async (req: Request, res: Response) => {
    const payrollBonusId = String(req.params.payrollBonusId ?? "").trim();
    if (!payrollBonusId) throw new Error("PAYROLL_BONUS_ID_REQUIRED");

    const body = VoidBonusBodySchema.parse(req.body);
    const actor = this.actorFrom(res);

    const bonus = await this.voidBonusUc.execute({
      actor: {
        actorType: actor.actorType,
        role: actor.role,
        branchId: actor.branchId,
        userId: actor.actorId,
      },
      payrollBonusId,
      branchId: body.branchId,
      reason: body.reason,
      expectedVersion: body.expectedVersion ?? null,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "payroll.bonus.void",
      entity: "payroll_bonus_entries",
      entityId: bonus.payrollBonusId,
      payload: {
        branchId: bonus.branchId,
        staffId: bonus.staffId,
        reason: body.reason,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(bonus);
  };
}
