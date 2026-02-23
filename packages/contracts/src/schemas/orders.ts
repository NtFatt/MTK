import { z } from "zod";
import { zId, zIsoDateTime, zMoney } from "./common";
import { zCartItem } from "./cart";

/**
 * orders.ts
 *
 * Endpoints:
 * - POST /api/v1/orders/from-cart/:cartKey
 * - GET  /api/v1/orders/:orderCode/status
 */

export const zOrderStatus = z.string();

export const zOrder = z
  .object({
    orderCode: z.string(),
    branchId: zId.optional(),
    sessionKey: z.string().optional(),
    status: zOrderStatus.optional(),
    items: z.array(zCartItem).optional(),
    subtotal: zMoney.optional(),
    total: zMoney.optional(),
    createdAt: zIsoDateTime.optional(),
    updatedAt: zIsoDateTime.optional(),
  })
  .partial({ branchId: true, sessionKey: true, status: true, items: true, subtotal: true, total: true, createdAt: true, updatedAt: true });

export const zOrderStatusResponse = z
  .object({
    orderCode: z.string(),
    status: zOrderStatus,
    updatedAt: zIsoDateTime.optional(),
  })
  .partial({ updatedAt: true });

// Internal endpoints
export const zKitchenQueueItem = z
  .object({
    orderCode: z.string().optional(),
    itemId: zId.optional(),
    name: z.string().optional(),
    qty: z.number().int().positive().optional(),
    status: z.string().optional(),
    createdAt: zIsoDateTime.optional(),
  })
  .partial();

export const zKitchenQueue = z.object({
  items: z.array(zKitchenQueueItem).default([]),
});
