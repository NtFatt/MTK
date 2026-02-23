import type { Request, Response } from "express";
import { z } from "zod";
import type { CreateReservation } from "../../../application/use-cases/reservation/CreateReservation.js";
import type { GetReservationAvailability } from "../../../application/use-cases/reservation/GetReservationAvailability.js";
import type { GetReservation } from "../../../application/use-cases/reservation/GetReservation.js";
import type { CancelReservation } from "../../../application/use-cases/reservation/CancelReservation.js";
import type { TableReservation } from "../../../domain/entities/TableReservation.js";
import { sendCachedJson } from "../utils/httpCache.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

function parseDateOrThrow(raw: unknown, errCode: string): Date {
  const s = String(raw ?? "").trim();
  const d = new Date(s);
  if (!s || Number.isNaN(d.getTime())) throw new Error(errCode);
  return d;
}

function parseIntOrThrow(raw: unknown, errCode: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(errCode);
  return n;
}

function toJson(r: TableReservation) {
  return {
    reservationId: r.id,
    reservationCode: r.reservationCode,
    status: r.status,
    tableId: r.tableId,
    tableCode: r.tableCodeSnapshot,
    areaName: r.areaNameSnapshot,
    partySize: r.partySize,
    contactPhone: r.contactPhone,
    contactName: r.contactName,
    note: r.note,
    reservedFrom: r.reservedFrom.toISOString(),
    reservedTo: r.reservedTo.toISOString(),
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
    canceledAt: r.canceledAt ? r.canceledAt.toISOString() : null,
    checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
    sessionId: r.sessionId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const CreateBodySchema = z.object({
  areaName: z.string().min(1).max(80),
  partySize: z.number().int().min(1).max(50),
  contactPhone: z.string().min(6).max(20),
  contactName: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  reservedFrom: z.string().min(1),
  reservedTo: z.string().min(1),
});

export class ReservationController {
  constructor(
    private availabilityUc: GetReservationAvailability,
    private createUc: CreateReservation,
    private getUc: GetReservation,
    private cancelUc: CancelReservation,
  ) {}

  availability = async (req: Request, res: Response) => {
    const areaName = mustString(req.query.areaName, "AREA_NAME");
    const partySize = parseIntOrThrow(req.query.partySize, "PARTY_SIZE_INVALID");
    const reservedFrom = parseDateOrThrow(req.query.reservedFrom, "INVALID_RESERVED_FROM");
    const reservedTo = parseDateOrThrow(req.query.reservedTo, "INVALID_RESERVED_TO");

    const out = await this.availabilityUc.execute({
      areaName,
      partySize,
      reservedFrom,
      reservedTo,
    });

    // Public read: cache very short (availability is time-sensitive).
    return sendCachedJson(req, res, out, { ttlSeconds: 10 });
  };

  create = async (req: Request, res: Response) => {
    const body = CreateBodySchema.parse(req.body);
    const reservedFrom = parseDateOrThrow(body.reservedFrom, "INVALID_RESERVED_FROM");
    const reservedTo = parseDateOrThrow(body.reservedTo, "INVALID_RESERVED_TO");

    const created = await this.createUc.execute({
      areaName: body.areaName,
      partySize: body.partySize,
      contactPhone: body.contactPhone,
      contactName: body.contactName ?? null,
      note: body.note ?? null,
      reservedFrom,
      reservedTo,
    });

    return res.status(201).json(toJson(created));
  };

  getByCode = async (req: Request, res: Response) => {
    const reservationCode = mustString(req.params.reservationCode, "RESERVATION_CODE");

    const found = await this.getUc.execute(reservationCode);
    if (!found) throw new Error("RESERVATION_NOT_FOUND");

    return res.json(toJson(found));
  };

  cancelByCode = async (req: Request, res: Response) => {
    const reservationCode = mustString(req.params.reservationCode, "RESERVATION_CODE");

    const updated = await this.cancelUc.execute(reservationCode);
    if (!updated) throw new Error("RESERVATION_NOT_FOUND");

    return res.json(toJson(updated));
  };
}
