import { z } from "zod";
import { zId, zMoney } from "./common";

/**
 * cart.ts
 *
 * Endpoints:
 * - POST /api/v1/carts/session/:sessionKey
 * - GET  /api/v1/carts/:cartKey
 * - PUT  /api/v1/carts/:cartKey/items
 * - DELETE /api/v1/carts/:cartKey/items/:itemId
 */

export const zCartItemOption = z
  .object({
    key: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })
  .partial();

export const zCartItem = z
  .object({
    itemId: zId,
    name: z.string().optional(),
    qty: z.number().int().positive(),
    unitPrice: zMoney.optional(),

    // “enterprise signature” (khuyến nghị trong spec/handover):
    note: z.string().optional(),
    options: z.array(zCartItemOption).optional(),
    optionsHash: z.string().optional(),
  })
  .partial({ name: true, unitPrice: true, note: true, options: true, optionsHash: true });

export const zCart = z
  .object({
    cartKey: z.string(),
    sessionKey: z.string().optional(),
    branchId: zId.optional(),
    items: z.array(zCartItem).default([]),
    subtotal: zMoney.optional(),
    total: zMoney.optional(),
  })
  .partial({ sessionKey: true, branchId: true, subtotal: true, total: true });

export const zUpsertCartItemsBody = z.object({
  items: z.array(zCartItem),
});
