import type { Request, Response } from "express";
import { z } from "zod";
import type { CreateMenuItem } from "../../../application/use-cases/admin/menu/CreateMenuItem.js";

const CreateMenuItemBody = z.object({
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

export class AdminMenuController {
    constructor(private readonly createMenuItemUc: CreateMenuItem) { }

    createItem = async (req: Request, res: Response) => {
        const body = CreateMenuItemBody.parse(req.body);

        const out = await this.createMenuItemUc.execute({
            categoryId: body.categoryId,
            name: body.name,
            price: body.price,
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        });

        return res.status(201).json({
            id: out.id,
            categoryId: out.categoryId,
            categoryName: out.categoryName ?? undefined,
            name: out.name,
            price: out.price,
            description: out.description ?? null,
            imageUrl: out.imageUrl ?? null,
            isActive: out.isActive,
            stockQty: out.stockQty ?? null,
            isCombo: out.isCombo ?? false,
            isMeat: out.isMeat ?? false,
        });
    };
}