import type { Request, Response } from "express";
import { z } from "zod";
import type { ListReservations } from "../../../application/use-cases/admin/reservation/ListReservations.js";
import type { ConfirmReservation } from "../../../application/use-cases/admin/reservation/ConfirmReservation.js";
import type { CheckInReservation } from "../../../application/use-cases/admin/reservation/CheckInReservation.js";
import type { ReservationStatus, TableReservation } from "../../../domain/entities/TableReservation.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

function parseDateOptional(raw: unknown, errCode: string): Date | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) throw new Error(errCode);
  return d;
}

function parseIntOptional(raw: unknown, errCode: string): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
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
    checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
    sessionId: r.sessionId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const StatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELED",
  "EXPIRED",
  "CHECKED_IN",
  "NO_SHOW",
  "COMPLETED",
]);

export class AdminReservationController {
  constructor(
    private listUc: ListReservations,
    private confirmUc: ConfirmReservation,
    private checkInUc: CheckInReservation,
  ) {}

  list = async (req: Request, res: Response) => {
    const internal = (res.locals as any)?.internal;
    if (!internal) throw new Error("INVALID_TOKEN");

    const statusRaw = req.query.status;
    const status = statusRaw
      ? (StatusSchema.parse(String(statusRaw)) as ReservationStatus)
      : undefined;

    const phone = typeof req.query.phone === "string" ? req.query.phone : undefined;
    const from = parseDateOptional(req.query.from, "INVALID_FROM");
    const to = parseDateOptional(req.query.to, "INVALID_TO");
    const limit = parseIntOptional(req.query.limit, "INVALID_LIMIT");

    const branchIdRaw = req.query.branchId;
    const branchIdQuery = (branchIdRaw === undefined || branchIdRaw === null || branchIdRaw === "")
      ? undefined
      : String(branchIdRaw);

    // Branch-scope: STAFF token => forced to actor.branchId.
    // ADMIN token => allow query branchId (optional).
    const branchId = (internal.actorType === "STAFF")
      ? (internal.branchId ? String(internal.branchId) : (() => { throw new Error("BRANCH_SCOPE_REQUIRED"); })())
      : branchIdQuery;

    const payload = {
      ...(branchId !== undefined && { branchId }),
      ...(status !== undefined && { status }),
      ...(phone !== undefined && { phone }),
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
      ...(limit !== undefined && { limit }),
    };

    const out = await this.listUc.execute(payload);
    return res.json(out.map(toJson));
  };

  confirm = async (req: Request, res: Response) => {
    const reservationCode = mustString(req.params.reservationCode, "RESERVATION_CODE");
    const internal = (res.locals as any)?.internal;
    if (!internal) throw new Error("INVALID_TOKEN");

    const actor = {
      actorType: internal.actorType as "ADMIN" | "STAFF",
      branchId: internal.branchId !== undefined && internal.branchId !== null ? String(internal.branchId) : null,
    };

    // FK constraint: confirmed_by_admin_id references admin_users, so only ADMIN actor passes an id.
    const adminId = internal.actorType === "ADMIN" ? String(internal.userId) : null;

    const out = await this.confirmUc.execute({ reservationCode, adminId, actor });
    if (!out) throw new Error("RESERVATION_NOT_FOUND");

    return res.json(toJson(out));
  };

  checkIn = async (req: Request, res: Response) => {
    const reservationCode = mustString(req.params.reservationCode, "RESERVATION_CODE");

    const internal = (res.locals as any)?.internal;
    if (!internal) throw new Error("INVALID_TOKEN");

    const actor = {
      actorType: internal.actorType as "ADMIN" | "STAFF",
      branchId: internal.branchId !== undefined && internal.branchId !== null ? String(internal.branchId) : null,
    };

    const { reservation, session } = await this.checkInUc.execute({ reservationCode, actor });
    return res.json({
      reservation: toJson(reservation),
      sessionKey: session.sessionKey,
      tableId: session.tableId,
    });
  };
}
