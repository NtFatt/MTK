import { z } from "zod";
import { zId, zIsoDateTime, zMoney } from "./common";

/**
 * admin.ts
 *
 * Internal endpoints (skeleton):
 * - /api/v1/admin/staff*
 * - /api/v1/admin/reservations*
 * - /api/v1/admin/inventory*
 * - /api/v1/admin/ops/*
 */

export const zStaff = z
  .object({
    id: zId,
    username: z.string().optional(),
    fullName: z.string().nullable().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    branchId: zId.optional(),
    createdAt: zIsoDateTime.optional(),
  })
  .partial({ username: true, fullName: true, role: true, status: true, branchId: true, createdAt: true });

export const zReservation = z
  .object({
    code: z.string(),
    branchId: zId.optional(),
    customerName: z.string().optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
    time: zIsoDateTime.optional(),
    note: z.string().optional(),
  })
  .partial({ branchId: true, customerName: true, phone: true, status: true, time: true, note: true });

export const zInventoryStockRow = z
  .object({
    itemId: zId.optional(),
    itemName: z.string().optional(),
    branchId: zId.optional(),
    available: z.number().int().optional(),
    onHold: z.number().int().optional(),
    updatedAt: zIsoDateTime.optional(),
  })
  .partial();

export const zInventoryHoldRow = z
  .object({
    holdKey: z.string().optional(),
    itemId: zId.optional(),
    cartKey: z.string().optional(),
    qty: z.number().int().positive().optional(),
    ttlMs: z.number().int().nonnegative().optional(),
    createdAt: zIsoDateTime.optional(),
  })
  .partial();

export const zCashierUnpaidItem = z
  .object({
    orderCode: z.string().optional(),
    branchId: zId.optional(),
    total: zMoney.optional(),
    status: z.string().optional(),
    createdAt: zIsoDateTime.optional(),
  })
  .partial();
