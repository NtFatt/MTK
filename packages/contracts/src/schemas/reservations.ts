import { z } from "zod";
import { zIsoDateTime } from "./common";

/**
 * reservations.ts
 *
 * Endpoints:
 * - GET  /api/v1/reservations/availability
 * - POST /api/v1/reservations
 * - GET  /api/v1/reservations/:reservationCode
 * - POST /api/v1/reservations/:reservationCode/cancel
 * - GET  /api/v1/admin/reservations
 * - PATCH /api/v1/admin/reservations/:reservationCode/confirm
 * - POST /api/v1/admin/reservations/:reservationCode/checkin
 */

export const zReservationStatus = z.string();

const zIdLocal = z.union([z.string(), z.number()]);

export const zTableSlot = z
  .object({
    tableId: zIdLocal,
    branchId: zIdLocal.optional(),
    tableCode: z.string(),
    seats: z.number().int().nonnegative(),
    areaName: z.string(),
  })
  .partial({ branchId: true });

export const zReservationAvailability = z
  .object({
    available: z.boolean(),
    availableCount: z.number().int().nonnegative(),
    availableTables: z.array(zTableSlot).default([]),
    suggestedTable: zTableSlot.nullable(),
    unavailableReason: z.string().nullable(),
  })
  .partial({ unavailableReason: true });

export const zReservationRow = z
  .object({
    reservationId: zIdLocal,
    reservationCode: z.string(),
    status: zReservationStatus,
    tableId: zIdLocal.nullable(),
    tableCode: z.string().nullable(),
    areaName: z.string().nullable(),
    partySize: z.number().int().nonnegative(),
    contactPhone: z.string().nullable(),
    contactName: z.string().nullable(),
    note: z.string().nullable(),
    reservedFrom: zIsoDateTime.nullable(),
    reservedTo: zIsoDateTime.nullable(),
    expiresAt: zIsoDateTime.nullable(),
    confirmedAt: zIsoDateTime.nullable(),
    canceledAt: zIsoDateTime.nullable(),
    checkedInAt: zIsoDateTime.nullable(),
    sessionId: z.string().nullable(),
    createdAt: zIsoDateTime.nullable(),
    updatedAt: zIsoDateTime.nullable(),
  })
  .partial({
    tableId: true,
    tableCode: true,
    areaName: true,
    contactName: true,
    note: true,
    reservedFrom: true,
    reservedTo: true,
    expiresAt: true,
    confirmedAt: true,
    canceledAt: true,
    checkedInAt: true,
    sessionId: true,
    createdAt: true,
    updatedAt: true,
  });

export const zCreateReservationInput = z.object({
  tableId: zIdLocal.optional(),
  areaName: z.string().min(1),
  partySize: z.number().int().min(1),
  contactPhone: z.string().min(6),
  contactName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  reservedFrom: zIsoDateTime,
  reservedTo: zIsoDateTime,
});

export const zReservationAvailabilityParams = z.object({
  branchId: zIdLocal,
  partySize: z.coerce.number().int().min(1),
  reservedFrom: zIsoDateTime,
  reservedTo: zIsoDateTime,
  areaName: z.string().optional(),
});

export const zListReservationsInput = z.object({
  branchId: zIdLocal.optional(),
  status: zReservationStatus.optional(),
  phone: z.string().optional(),
  from: zIsoDateTime.optional(),
  to: zIsoDateTime.optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const zCheckinResult = z.object({
  reservation: zReservationRow,
  sessionKey: z.string().nullable(),
  tableId: zIdLocal.nullable(),
});
