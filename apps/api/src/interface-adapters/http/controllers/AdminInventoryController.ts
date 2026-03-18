import type { Request, Response } from "express";
import { z } from "zod";

import type { ListBranchStock } from "../../../application/use-cases/admin/inventory/ListBranchStock.js";
import type { AdjustBranchStock } from "../../../application/use-cases/admin/inventory/AdjustBranchStock.js";
import type { ListActiveHolds } from "../../../application/use-cases/admin/inventory/ListActiveHolds.js";
import type { GetStockDriftMetrics } from "../../../application/use-cases/admin/inventory/GetStockDriftMetrics.js";
import type { TriggerStockRehydrate } from "../../../application/use-cases/admin/inventory/TriggerStockRehydrate.js";
import type { BumpMenuVersion } from "../../../application/use-cases/admin/inventory/BumpMenuVersion.js";
import type { ListInventoryAdjustmentAudit } from "../../../application/use-cases/admin/inventory/ListInventoryAdjustmentAudit.js";

import type { ListInventoryItems } from "../../../application/use-cases/admin/inventory/ListInventoryItems.js";
import type { CreateInventoryItem } from "../../../application/use-cases/admin/inventory/CreateInventoryItem.js";
import type { UpdateInventoryItem } from "../../../application/use-cases/admin/inventory/UpdateInventoryItem.js";
import type { AdjustInventoryItem } from "../../../application/use-cases/admin/inventory/AdjustInventoryItem.js";
import type { ListInventoryAlerts } from "../../../application/use-cases/admin/inventory/ListInventoryAlerts.js";
import type { GetMenuItemRecipe } from "../../../application/use-cases/admin/menu/GetMenuItemRecipe.js";
import type { SaveMenuItemRecipe } from "../../../application/use-cases/admin/menu/SaveMenuItemRecipe.js";

import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";
import { env } from "../../../infrastructure/config/env.js";

const StockQuery = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
});

const HoldsQuery = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v))),
});

const AdjustBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform((v) => String(v)),
  itemId: z.union([z.string().min(1), z.number().int().positive()]).transform((v) => String(v)),
  mode: z.enum(["RESTOCK", "DEDUCT", "SET"]),
  quantity: z.number().int().min(0),
  reason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

const AdjustmentHistoryQuery = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
  itemId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
  actorId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
  mode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : Number(v))),
  cursor: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
});

const IngredientListQuery = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
});

const CreateIngredientBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  ingredientCode: z.string().trim().min(1).max(64),
  ingredientName: z.string().trim().min(1).max(255),
  unit: z.string().trim().min(1).max(32),
  currentQty: z.number().min(0),
  warningThreshold: z.number().min(0),
  criticalThreshold: z.number().min(0),
  isActive: z.boolean().optional().default(true),
});

const UpdateIngredientBody = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
  ingredientName: z.string().trim().min(1).max(255).optional(),
  unit: z.string().trim().min(1).max(32).optional(),
  warningThreshold: z.number().min(0).optional(),
  criticalThreshold: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const AdjustIngredientBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  adjustmentType: z.enum(["IN", "OUT", "SET", "CORRECTION"]),
  quantity: z.number().min(0),
  reason: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

const RecipeQuery = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
});

const RecipeBody = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  lines: z.array(
    z.object({
      ingredientId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
      qtyPerItem: z.number().gt(0),
      unit: z.string().trim().min(1).max(32),
    }),
  ),
});

export class AdminInventoryController {
  constructor(
    private readonly listStockUc: ListBranchStock,
    private readonly adjustUc: AdjustBranchStock,
    private readonly listHoldsUc: ListActiveHolds | null,
    private readonly driftUc: GetStockDriftMetrics | null,
    private readonly rehydrateUc: TriggerStockRehydrate | null,
    private readonly bumpMenuUc: BumpMenuVersion | null,
    private readonly listAdjustmentAuditUc: ListInventoryAdjustmentAudit,

    private readonly listInventoryItemsUc: ListInventoryItems,
    private readonly createInventoryItemUc: CreateInventoryItem,
    private readonly updateInventoryItemUc: UpdateInventoryItem,
    private readonly adjustInventoryItemUc: AdjustInventoryItem,
    private readonly listInventoryAlertsUc: ListInventoryAlerts,
    private readonly getMenuRecipeUc: GetMenuItemRecipe,
    private readonly saveMenuRecipeUc: SaveMenuItemRecipe,

    private readonly auditRepo: IAuditLogRepository,
  ) { }

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

  private resolveBranchId(
    actor: { actorType: string; role: string; branchId: string | null },
    requestedBranchId?: string | null,
  ): string {
    const mustUseOwnBranch =
      actor.actorType === "STAFF" ||
      actor.role === "STAFF" ||
      actor.role === "BRANCH_MANAGER";

    if (mustUseOwnBranch) {
      if (!actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      return String(actor.branchId);
    }

    const finalBranchId = requestedBranchId ?? actor.branchId ?? null;
    if (!finalBranchId) throw new Error("BRANCH_REQUIRED");
    return String(finalBranchId);
  }

  listStock = async (req: Request, res: Response) => {
    const q = StockQuery.parse(req.query);
    const actor = this.actorFrom(res);

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
      entityId: out.itemId,
      payload: {
        mode: out.mode,
        prevQty: out.prevQty,
        newQty: out.newQty,
        branchId: out.branchId,
        itemId: out.itemId,
        reason: body.reason ?? null,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
        ...(out.redis ? { redis: out.redis } : {}),
      },
    });

    return res.json({
      ...out,
      reason: body.reason ?? null,
    });
  };

  listAdjustments = async (req: Request, res: Response) => {
    const q = AdjustmentHistoryQuery.parse(req.query);
    const actor = this.actorFrom(res);

    const out = await this.listAdjustmentAuditUc.execute({
      actor: { role: actor.role, branchId: actor.branchId },
      branchId: q.branchId ?? null,
      itemId: q.itemId ?? null,
      actorId: q.actorId ?? null,
      mode: q.mode ?? null,
      from: q.from ?? null,
      to: q.to ?? null,
      limit: q.limit ?? 50,
      beforeAuditId: q.cursor ?? null,
    });

    return res.json({
      items: out.items,
      page: {
        limit: q.limit ?? 50,
        nextCursor: out.nextCursor,
        hasMore: out.hasMore,
      },
    });
  };

  listInventoryItems = async (req: Request, res: Response) => {
    const q = IngredientListQuery.parse(req.query);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, q.branchId ?? null);

    const items = await this.listInventoryItemsUc.execute({
      branchId,
      actor: { role: actor.role, branchId: actor.branchId },
    });

    return res.json({ items });
  };

  createInventoryItem = async (req: Request, res: Response) => {
    const body = CreateIngredientBody.parse(req.body);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, body.branchId);

    const item = await this.createInventoryItemUc.execute({
      branchId,
      ingredientCode: body.ingredientCode,
      ingredientName: body.ingredientName,
      unit: body.unit,
      currentQty: body.currentQty,
      warningThreshold: body.warningThreshold,
      criticalThreshold: body.criticalThreshold,
      isActive: body.isActive,
      actor: { role: actor.role, branchId: actor.branchId },
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "inventory.ingredient.create",
      entity: "inventory_item",
      entityId: item.id,
      payload: {
        branchId,
        ingredientCode: item.ingredientCode,
        ingredientName: item.ingredientName,
        unit: item.unit,
        currentQty: item.currentQty,
        warningThreshold: item.warningThreshold,
        criticalThreshold: item.criticalThreshold,
        isActive: item.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(item);
  };

  updateInventoryItem = async (req: Request, res: Response) => {
    const body = UpdateIngredientBody.parse(req.body);
    const actor = this.actorFrom(res);
    const ingredientId = String(req.params.ingredientId);
    const branchId = this.resolveBranchId(actor, body.branchId ?? null);

    const updatePayload: {
      ingredientId: string;
      branchId: string;
      ingredientName?: string;
      unit?: string;
      warningThreshold?: number;
      criticalThreshold?: number;
      isActive?: boolean;
      actor: { role: string; branchId: string | null };
    } = {
      ingredientId,
      branchId,
      actor: { role: actor.role, branchId: actor.branchId },
    };

    if (body.ingredientName !== undefined) {
      updatePayload.ingredientName = body.ingredientName;
    }

    if (body.unit !== undefined) {
      updatePayload.unit = body.unit;
    }

    if (body.warningThreshold !== undefined) {
      updatePayload.warningThreshold = body.warningThreshold;
    }

    if (body.criticalThreshold !== undefined) {
      updatePayload.criticalThreshold = body.criticalThreshold;
    }

    if (body.isActive !== undefined) {
      updatePayload.isActive = body.isActive;
    }

    const item = await this.updateInventoryItemUc.execute(updatePayload);

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "inventory.ingredient.update",
      entity: "inventory_item",
      entityId: item.id,
      payload: {
        branchId,
        ingredientName: item.ingredientName,
        unit: item.unit,
        warningThreshold: item.warningThreshold,
        criticalThreshold: item.criticalThreshold,
        isActive: item.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(item);
  };

  adjustInventoryItem = async (req: Request, res: Response) => {
    const body = AdjustIngredientBody.parse(req.body);
    const actor = this.actorFrom(res);
    const ingredientId = String(req.params.ingredientId);
    const branchId = this.resolveBranchId(actor, body.branchId);

    const out = await this.adjustInventoryItemUc.execute({
      ingredientId,
      branchId,
      adjustmentType: body.adjustmentType,
      quantity: body.quantity,
      reason: body.reason ?? null,
      actor: {
        role: actor.role,
        branchId: actor.branchId,
        actorType: actor.actorType,
        actorId: actor.actorId,
      },
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "inventory.ingredient.adjust",
      entity: "inventory_item",
      entityId: out.ingredientId,
      payload: {
        branchId: out.branchId,
        ingredientId: out.ingredientId,
        adjustmentType: out.adjustmentType,
        prevQty: out.prevQty,
        newQty: out.newQty,
        reason: body.reason ?? null,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json({
      ...out,
      reason: body.reason ?? null,
    });
  };

  listInventoryAlerts = async (req: Request, res: Response) => {
    const q = IngredientListQuery.parse(req.query);
    const actor = this.actorFrom(res);
    const branchId = this.resolveBranchId(actor, q.branchId ?? null);

    const items = await this.listInventoryAlertsUc.execute({
      branchId,
      actor: { role: actor.role, branchId: actor.branchId },
    });

    return res.json({ items });
  };

  getMenuItemRecipe = async (req: Request, res: Response) => {
    const q = RecipeQuery.parse(req.query);
    const actor = this.actorFrom(res);
    const menuItemId = String(req.params.itemId);
    const branchId = this.resolveBranchId(actor, q.branchId ?? null);

    const items = await this.getMenuRecipeUc.execute({
      menuItemId,
      branchId,
      actor: { role: actor.role, branchId: actor.branchId },
    });

    return res.json({
      itemId: menuItemId,
      items,
    });
  };

  saveMenuItemRecipe = async (req: Request, res: Response) => {
    const body = RecipeBody.parse(req.body);
    const actor = this.actorFrom(res);
    const menuItemId = String(req.params.itemId);
    const branchId = this.resolveBranchId(actor, body.branchId);

    const items = await this.saveMenuRecipeUc.execute({
      menuItemId,
      branchId,
      lines: body.lines,
      actor: { role: actor.role, branchId: actor.branchId },
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "menu.recipe.save",
      entity: "menu_item_recipe",
      entityId: menuItemId,
      payload: {
        branchId,
        menuItemId,
        lineCount: items.length,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json({
      itemId: menuItemId,
      items,
    });
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