import type { Request, Response } from "express";
import { z } from "zod";
import type { GetMenuCategories } from "../../../application/use-cases/menu/GetMenuCategories.js";
import type { ListMenuItems } from "../../../application/use-cases/menu/ListMenuItems.js";
import type { CreateMenuItem } from "../../../application/use-cases/admin/menu/CreateMenuItem.js";
import type { UpdateMenuItem } from "../../../application/use-cases/admin/menu/UpdateMenuItem.js";
import type { SetMenuItemActive } from "../../../application/use-cases/admin/menu/SetMenuItemActive.js";
import type { MenuItem } from "../../../domain/entities/MenuItem.js";

const MenuItemBody = z.object({
  categoryId: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
  name: z.string().trim().min(1).max(255),
  price: z.coerce.number().min(0),
  description: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const text = v.trim();
      return text.length > 0 ? text : null;
    }),
  imageUrl: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const text = v.trim();
      return text.length > 0 ? text : null;
    }),
  isActive: z.boolean().optional().default(true),
});

const UpdateMenuItemBody = z.object({
  categoryId: z.union([z.string().min(1), z.number().int().positive()]).transform(String).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  price: z.coerce.number().min(0).optional(),
  description: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const text = v.trim();
      return text.length > 0 ? text : null;
    }),
  imageUrl: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const text = v.trim();
      return text.length > 0 ? text : null;
    }),
  isActive: z.boolean().optional(),
});

const BooleanParam = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return value;
}, z.boolean());

const AdminListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  branchId: z.coerce.number().int().positive().optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "newest"]).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  includeInactive: BooleanParam.optional().default(true),
  isActive: BooleanParam.optional(),
});

const SetActiveBody = z.object({
  isActive: z.boolean(),
});

function mustId(v: unknown, field: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  throw new Error(`INVALID_${field}`);
}

function mapMenuItem(item: MenuItem) {
  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.categoryName ?? undefined,
    name: item.name,
    price: item.price,
    description: item.description ?? null,
    imageUrl: item.imageUrl ?? null,
    isActive: item.isActive,
    stockQty: item.stockQty ?? null,
    isCombo: item.isCombo ?? false,
    isMeat: item.isMeat ?? false,
  };
}

export class AdminMenuController {
  constructor(
    private readonly getMenuCategoriesUc: GetMenuCategories,
    private readonly listMenuItemsUc: ListMenuItems,
    private readonly createMenuItemUc: CreateMenuItem,
    private readonly updateMenuItemUc: UpdateMenuItem,
    private readonly setMenuItemActiveUc: SetMenuItemActive,
  ) {}

  categories = async (_req: Request, res: Response) => {
    const out = await this.getMenuCategoriesUc.execute(false);
    return res.json(
      out.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      })),
    );
  };

  items = async (req: Request, res: Response) => {
    const q = AdminListQuerySchema.parse(req.query);
    const out = await this.listMenuItemsUc.execute({
      categoryId: q.categoryId ? String(q.categoryId) : null,
      q: q.q ?? null,
      isActive: q.isActive ?? (q.includeInactive ? null : true),
      branchId: q.branchId ? String(q.branchId) : null,
      onlyInStock: null,
      sort: q.sort ?? "newest",
      limit: q.limit ?? null,
      offset: q.limit != null ? (q.offset ?? 0) : null,
    });

    return res.json({
      items: out.items.map(mapMenuItem),
      total: out.total,
    });
  };

  createItem = async (req: Request, res: Response) => {
    const body = MenuItemBody.parse(req.body);

    const out = await this.createMenuItemUc.execute({
      categoryId: body.categoryId,
      name: body.name,
      price: body.price,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    });

    return res.status(201).json(mapMenuItem(out));
  };

  updateItem = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const body = UpdateMenuItemBody.parse(req.body);

    const out = await this.updateMenuItemUc.execute({
      itemId,
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    });

    return res.json(mapMenuItem(out));
  };

  setItemActive = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const body = SetActiveBody.parse(req.body);

    const out = await this.setMenuItemActiveUc.execute({
      itemId,
      isActive: body.isActive,
    });

    return res.json(mapMenuItem(out));
  };
}