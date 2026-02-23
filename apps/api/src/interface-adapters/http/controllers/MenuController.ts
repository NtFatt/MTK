import type { Request, Response } from "express";
import { z } from "zod";
import type { GetMenuCategories } from "../../../application/use-cases/menu/GetMenuCategories.js";
import type { ListMenuItems } from "../../../application/use-cases/menu/ListMenuItems.js";
import type { GetMenuItemDetail } from "../../../application/use-cases/menu/GetMenuItemDetail.js";
import type { GetComboDetail } from "../../../application/use-cases/menu/GetComboDetail.js";
import type { GetMeatProfile } from "../../../application/use-cases/menu/GetMeatProfile.js";
import { sendCachedJson } from "../utils/httpCache.js";

function mustId(v: unknown, field: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  throw new Error(`INVALID_${field}`);
}

const ListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  branchId: z.coerce.number().int().positive().optional(),
  onlyInStock: z.coerce.boolean().optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "newest"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export class MenuController {
  constructor(
    private getMenuCategories: GetMenuCategories,
    private listMenuItems: ListMenuItems,
    private getMenuItemDetail: GetMenuItemDetail,
    private getComboDetail: GetComboDetail,
    private getMeatProfile: GetMeatProfile,
  ) {}

  categories = async (_req: Request, res: Response) => {
    const out = await this.getMenuCategories.execute();
    // Public read: cache short to reduce load (demo polish).
    return sendCachedJson(_req, res, out, { ttlSeconds: 60 });
  };

  items = async (req: Request, res: Response) => {
    const q = ListQuerySchema.parse(req.query);
    const out = await this.listMenuItems.execute({
      categoryId: q.categoryId ? String(q.categoryId) : null,
      q: q.q ?? null,
      isActive: q.includeInactive ? null : true,
      branchId: q.branchId ? String(q.branchId) : null,
      onlyInStock: q.onlyInStock ?? null,
      sort: (q.sort as any) ?? null,
      limit: q.limit,
      offset: q.offset,
    });
    // Items list is semi-dynamic (stock/pricing): keep TTL short.
    return sendCachedJson(req, res, out, { ttlSeconds: 15 });
  };

  itemDetail = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const out = await this.getMenuItemDetail.execute(itemId);
    if (!out) throw new Error("MENU_ITEM_NOT_FOUND");
    return sendCachedJson(req, res, out, { ttlSeconds: 60 });
  };

  comboDetail = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const out = await this.getComboDetail.execute(itemId);
    if (!out) throw new Error("COMBO_NOT_FOUND");
    return sendCachedJson(req, res, out, { ttlSeconds: 60 });
  };

  meatProfile = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const out = await this.getMeatProfile.execute(itemId);
    if (!out) throw new Error("MEAT_PROFILE_NOT_FOUND");
    return sendCachedJson(req, res, out, { ttlSeconds: 60 });
  };
}
