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

const zStringId = z.preprocess(
  (value) => (value == null ? value : String(value)),
  z.string().min(1),
);

const zOptionalStringId = z.preprocess(
  (value) => (value == null ? undefined : String(value)),
  z.string().min(1).optional(),
);

const zPositiveInt = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().int().positive(),
);

const zOptionalNonNegativeInt = z.preprocess(
  (value) => (value == null || value === "" ? undefined : typeof value === "string" ? Number(value) : value),
  z.number().int().nonnegative().optional(),
);

export const zTableStatus = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "OUT_OF_SERVICE",
]);

export const zOpsTableTopItem = z.object({
  name: z.string(),
  qty: z.number().int().nonnegative(),
});

export const zOpsTableRow = z.object({
  tableId: zStringId,
  branchId: zOptionalStringId,
  code: z.string().min(1),
  areaName: z.string().nullable().optional(),
  seats: zPositiveInt,
  tableStatus: zTableStatus,
  directionId: z.string().nullable().optional(),
  sessionKey: z.string().nullable().optional(),
  cartKey: z.string().nullable().optional(),
  activeOrdersCount: zOptionalNonNegativeInt.default(0),
  activeOrderCode: z.string().nullable().optional(),
  activeOrderStatus: z.string().nullable().optional(),
  activeOrderUpdatedAt: zIsoDateTime.nullable().optional(),
  activeItemsCount: zOptionalNonNegativeInt.nullable().optional(),
  activeItemsPreview: z.string().nullable().optional(),
  activeItemsTop: z.array(zOpsTableTopItem).nullable().optional(),
  unpaidOrdersCount: zOptionalNonNegativeInt.default(0),
  unpaidOrderCode: z.string().nullable().optional(),
  unpaidOrderStatus: z.string().nullable().optional(),
  unpaidOrderUpdatedAt: zIsoDateTime.nullable().optional(),
  unpaidItemsCount: zOptionalNonNegativeInt.nullable().optional(),
  unpaidItemsPreview: z.string().nullable().optional(),
  unpaidItemsTop: z.array(zOpsTableTopItem).nullable().optional(),
});

export const zOpsTableListResponse = z.object({
  items: z.array(zOpsTableRow),
});

export const zAdminTableMutationPayload = z.object({
  branchId: zStringId,
  code: z.string().trim().min(1),
  seats: zPositiveInt,
  areaName: z.string().trim().nullable().optional(),
});

export const zAdminTableRecord = z.object({
  id: zStringId,
  branchId: zOptionalStringId,
  code: z.string().min(1),
  status: zTableStatus,
  directionId: z.string().min(1),
  seats: zPositiveInt,
  areaName: z.string().nullable().optional(),
});

export type OpsTableTopItem = z.infer<typeof zOpsTableTopItem>;
export type OpsTableRow = z.infer<typeof zOpsTableRow>;
export type OpsTableListResponse = z.infer<typeof zOpsTableListResponse>;
export type AdminTableMutationPayload = z.infer<typeof zAdminTableMutationPayload>;
export type AdminTableRecord = z.infer<typeof zAdminTableRecord>;
