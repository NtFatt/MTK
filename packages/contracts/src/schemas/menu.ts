import { z } from "zod";
import { zId, zMoney } from "./common";

/**
 * menu.ts
 *
 * Endpoints:
 * - GET /api/v1/menu/categories
 * - GET /api/v1/menu/items
 * - GET /api/v1/menu/items/:itemId
 * - GET /api/v1/menu/items/:itemId/combo
 * - GET /api/v1/menu/items/:itemId/meat-profile
 */

export const zMenuCategory = z
  .object({
    id: zId,
    name: z.string(),
    code: z.string().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .partial({ code: true, sortOrder: true, isActive: true });

export const zMenuItem = z
  .object({
    id: zId,
    name: z.string(),
    price: zMoney.optional(),
    categoryId: zId.optional(),
    imageUrl: z.string().url().optional(),
    description: z.string().optional(),
    isAvailable: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
  .partial({ price: true, categoryId: true, imageUrl: true, description: true, isAvailable: true, tags: true });

export const zMenuItemDetail = zMenuItem;

export const zComboItem = z
  .object({
    itemId: zId,
    name: z.string().optional(),
    qty: z.number().int().positive().optional(),
  })
  .partial();

export const zMenuItemCombo = z.object({
  items: z.array(zComboItem).default([]),
});

export const zMeatProfile = z
  .object({
    // skeleton: tùy backend
    level: z.string().optional(),
    recommended: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .partial();
