import type { Request, Response } from "express";
import { z } from "zod";
import type { ListMenuItems } from "../../../application/use-cases/menu/ListMenuItems.js";
import type { CreateMenuItem } from "../../../application/use-cases/admin/menu/CreateMenuItem.js";
import type { UpdateMenuItem } from "../../../application/use-cases/admin/menu/UpdateMenuItem.js";
import type { SetMenuItemActive } from "../../../application/use-cases/admin/menu/SetMenuItemActive.js";
import type { ListAdminMenuCategories } from "../../../application/use-cases/admin/menu/ListAdminMenuCategories.js";
import type { CreateMenuCategory } from "../../../application/use-cases/admin/menu/CreateMenuCategory.js";
import type { UpdateMenuCategory } from "../../../application/use-cases/admin/menu/UpdateMenuCategory.js";
import type { DeleteMenuCategory } from "../../../application/use-cases/admin/menu/DeleteMenuCategory.js";
import type { IAuditLogRepository } from "../../../application/ports/repositories/IAuditLogRepository.js";
import type { MenuItem } from "../../../domain/entities/MenuItem.js";
import { MenuCategory } from "../../../domain/entities/MenuCategory.js";

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

const MenuCategoryBody = z.object({
  name: z.string().trim().min(1).max(255),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const UpdateMenuCategoryBody = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
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

function mapCategory(category: MenuCategory, extra?: { itemCount?: number; activeItemCount?: number }) {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    itemCount: extra?.itemCount ?? 0,
    activeItemCount: extra?.activeItemCount ?? 0,
  };
}

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  actorId: string;
  username: string;
  role: string;
  branchId: string | null;
};

export class AdminMenuController {
  constructor(
    private readonly listAdminMenuCategoriesUc: ListAdminMenuCategories,
    private readonly listMenuItemsUc: ListMenuItems,
    private readonly createMenuItemUc: CreateMenuItem,
    private readonly updateMenuItemUc: UpdateMenuItem,
    private readonly setMenuItemActiveUc: SetMenuItemActive,
    private readonly createMenuCategoryUc: CreateMenuCategory,
    private readonly updateMenuCategoryUc: UpdateMenuCategory,
    private readonly deleteMenuCategoryUc: DeleteMenuCategory,
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

  categories = async (_req: Request, res: Response) => {
    const out = await this.listAdminMenuCategoriesUc.execute();
    return res.json(
      out.map((category) =>
        mapCategory(
          new MenuCategory(category.id, category.name, category.sortOrder, category.isActive),
          {
            itemCount: category.itemCount,
            activeItemCount: category.activeItemCount,
          },
        ),
      ),
    );
  };

  createCategory = async (req: Request, res: Response) => {
    const body = MenuCategoryBody.parse(req.body);
    const actor = this.actorFrom(res);

    const created = await this.createMenuCategoryUc.execute({
      name: body.name,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "menu.category.create",
      entity: "menu_categories",
      entityId: created.id,
      payload: {
        name: created.name,
        sortOrder: created.sortOrder,
        isActive: created.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(mapCategory(created));
  };

  updateCategory = async (req: Request, res: Response) => {
    const categoryId = mustId(req.params.categoryId as unknown, "CATEGORY_ID");
    const body = UpdateMenuCategoryBody.parse(req.body);
    const actor = this.actorFrom(res);

    const updated = await this.updateMenuCategoryUc.execute({
      categoryId,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "menu.category.update",
      entity: "menu_categories",
      entityId: updated.id,
      payload: {
        name: updated.name,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(mapCategory(updated));
  };

  deleteCategory = async (req: Request, res: Response) => {
    const categoryId = mustId(req.params.categoryId as unknown, "CATEGORY_ID");
    const actor = this.actorFrom(res);
    const deleted = await this.deleteMenuCategoryUc.execute({ categoryId });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "menu.category.delete",
      entity: "menu_categories",
      entityId: deleted.id,
      payload: {
        name: deleted.name,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(204).send();
  };

  items = async (req: Request, res: Response) => {
    const q = AdminListQuerySchema.parse(req.query);
    const out = await this.listMenuItemsUc.execute({
      categoryId: q.categoryId ? String(q.categoryId) : null,
      q: q.q ?? null,
      isActive: q.isActive ?? (q.includeInactive ? null : true),
      categoryIsActive: null,
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
    const actor = this.actorFrom(res);

    const out = await this.createMenuItemUc.execute({
      categoryId: body.categoryId,
      name: body.name,
      price: body.price,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "menu.item.create",
      entity: "menu_items",
      entityId: out.id,
      payload: {
        categoryId: out.categoryId,
        name: out.name,
        price: out.price,
        isActive: out.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.status(201).json(mapMenuItem(out));
  };

  updateItem = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const body = UpdateMenuItemBody.parse(req.body);
    const actor = this.actorFrom(res);

    const out = await this.updateMenuItemUc.execute({
      itemId,
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "menu.item.update",
      entity: "menu_items",
      entityId: out.id,
      payload: {
        categoryId: out.categoryId,
        name: out.name,
        price: out.price,
        isActive: out.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(mapMenuItem(out));
  };

  setItemActive = async (req: Request, res: Response) => {
    const itemId = mustId(req.params.itemId as unknown, "ITEM_ID");
    const body = SetActiveBody.parse(req.body);
    const actor = this.actorFrom(res);

    const out = await this.setMenuItemActiveUc.execute({
      itemId,
      isActive: body.isActive,
    });

    await this.auditRepo.append({
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: out.isActive ? "menu.item.activate" : "menu.item.deactivate",
      entity: "menu_items",
      entityId: out.id,
      payload: {
        categoryId: out.categoryId,
        name: out.name,
        isActive: out.isActive,
        ip: req.ip,
        userAgent: req.header("user-agent") ?? null,
      },
    });

    return res.json(mapMenuItem(out));
  };
}
