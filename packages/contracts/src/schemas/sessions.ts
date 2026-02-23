import { z } from "zod";
import { zId, zIsoDateTime } from "./common";

/**
 * sessions.ts
 *
 * Endpoints:
 * - POST /api/v1/sessions/open
 * - POST /api/v1/sessions/:sessionKey/close
 */

export const zRestaurantTable = z
  .object({
    id: zId,
    code: z.string().optional(),
    status: z.string().optional(),
    directionId: z.string().optional(),
    seats: z.number().int().positive().optional(),
    branchId: zId.optional(),
  })
  .partial();

export const zOpenSessionRequest = z
  .object({
    // skeleton: backend có thể nhận tableId/tableCode/directionId/branchId...
    branchId: zId.optional(),
    tableId: zId.optional(),
    tableCode: z.string().optional(),
    directionId: z.string().optional(),
    seats: z.number().int().positive().optional(),
  })
  .partial();

export const zTableSession = z
  .object({
    sessionKey: z.string(),
    status: z.string().optional(),
    branchId: zId.optional(),
    table: zRestaurantTable.optional(),
    openedAt: zIsoDateTime.optional(),
    closedAt: zIsoDateTime.optional(),
  })
  .partial({ status: true, branchId: true, table: true, openedAt: true, closedAt: true });
