import type { Request, Response } from "express";
import { z } from "zod";
import type { ListBranchStock } from "../../../application/use-cases/admin/inventory/ListBranchStock.js";
import type { AdjustBranchStock } from "../../../application/use-cases/admin/inventory/AdjustBranchStock.js";
import type { ListActiveHolds } from "../../../application/use-cases/admin/inventory/ListActiveHolds.js";
import type { GetStockDriftMetrics } from "../../../application/use-cases/admin/inventory/GetStockDriftMetrics.js";
import type { TriggerStockRehydrate } from "../../../application/use-cases/admin/inventory/TriggerStockRehydrate.js";
import type { BumpMenuVersion } from "../../../application/use-cases/admin/inventory/BumpMenuVersion.js";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";
import { env } from "../../../infrastructure/config/env.js";

const StockQuery = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).optional().transform((v) =>
    v === undefined ? undefined : String(v),
  ),
});

const HoldsQuery = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).optional().transform((v) =>
    v === undefined ? undefined : String(v),
  ),
  limit: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : Number(v))),
});

const AdjustBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform((v) => String(v)),
  itemId: z.union([z.string().min(1), z.number().int().positive()]).transform((v) => String(v)),
  mode: z.enum(["RESTOCK", "DEDUCT", "SET"]),
  quantity: z.number().int().min(0),
});

export class AdminInventoryController {
  constructor(
    private readonly listStockUc: ListBranchStock,
    private readonly adjustUc: AdjustBranchStock,
    private readonly listHoldsUc: ListActiveHolds | null,
    private readonly driftUc: GetStockDriftMetrics | null,
    private readonly rehydrateUc: TriggerStockRehydrate | null,
    private readonly bumpMenuUc: BumpMenuVersion | null,
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

  listStock = async (req: Request, res: Response) => {
    const q = StockQuery.parse(req.query);
    const actor = this.actorFrom(res);

    // Branch-scope normalization:
    // - STAFF tokens (including STAFF/KITCHEN/CASHIER/BRANCH_MANAGER) must be limited to their branchId.
    // - ADMIN tokens may pass branchId via query.
    let branchId = q.branchId ?? null;
    if (actor.actorType === "STAFF") {
      if (!actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = actor.branchId;
    }

    const rows = await this.listStockUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId,
    });

    return res.json({ items: rows });
  };

  listHolds = async (req: Request, res: Response) => {
    if (!this.listHoldsUc) throw new Error("REDIS_REQUIRED");
    if (!env.REDIS_STOCK_HOLDS_ENABLED) throw new Error("FEATURE_DISABLED");

    const q = HoldsQuery.parse(req.query);
    const actor = this.actorFrom(res);

    let branchId = q.branchId ?? null;
    if (actor.actorType === "STAFF") {
      if (!actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = actor.branchId;
    }

    const rows = await this.listHoldsUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId,
      limit: q.limit ?? null,
    });

    return res.json({ items: rows });
  };

  getDriftMetrics = async (_req: Request, res: Response) => {
    if (!this.driftUc) throw new Error("REDIS_REQUIRED");
    const data = await this.driftUc.execute();
    return res.json({ data });
  };

  adjustStock = async (req: Request, res: Response) => {
    const body = AdjustBody.parse(req.body);
    const actor = this.actorFrom(res);

    const out = await this.adjustUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: body.branchId,
      itemId: body.itemId,
      mode: body.mode,
      quantity: body.quantity,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "inventory.adjust",
      entity: "menu_item_stock",
      // audit_logs.entity_id is numeric; use itemId and keep branchId in payload.
      entityId: out.itemId,
      payload: {
        mode: out.mode,
        prevQty: out.prevQty,
        newQty: out.newQty,
        branchId: out.branchId,
        itemId: out.itemId,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
        ...(out.redis ? { redis: out.redis } : {}),
      },
    });

    return res.json(out);
  };

  runRehydrate = async (_req: Request, res: Response) => {
    if (!this.rehydrateUc) throw new Error("REDIS_REQUIRED");
    if (!env.STOCK_REHYDRATE_ENABLED) throw new Error("FEATURE_DISABLED");
    const r = await this.rehydrateUc.execute();
    return res.json({ data: r });
  };

  bumpMenuVersion = async (_req: Request, res: Response) => {
    if (!this.bumpMenuUc) throw new Error("REDIS_REQUIRED");
    if (!env.MENU_CACHE_ENABLED) throw new Error("FEATURE_DISABLED");
    const out = await this.bumpMenuUc.execute();
    return res.json(out);
  };
}
