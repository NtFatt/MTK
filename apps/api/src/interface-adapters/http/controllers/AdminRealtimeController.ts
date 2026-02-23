import type { Request, Response } from "express";
import type { ListAdminRealtimeAuditEvents } from "../../../application/use-cases/admin/realtime/ListAdminRealtimeAuditEvents.js";
import type { ReplayAdminRealtimeAuditEvents } from "../../../application/use-cases/admin/realtime/ReplayAdminRealtimeAuditEvents.js";

function toInt(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error("INVALID_LIMIT");
  return n;
}

function toIntStrict(raw: unknown, errCode: string): number {
  if (raw === undefined || raw === null || raw === "") throw new Error(errCode);
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(errCode);
  return n;
}

function toStringOpt(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return String(raw);
}

export class AdminRealtimeController {
  constructor(
    private listAuditUc: ListAdminRealtimeAuditEvents,
    private replayAuditUc?: ReplayAdminRealtimeAuditEvents,
  ) {}

  listAudit = async (req: Request, res: Response) => {
    const limit = toInt(req.query.limit) ?? 100;
    const room = toStringOpt(req.query.room) ?? "admin";
    const out = await this.listAuditUc.execute({ room, limit });
    return res.json(out);
  };

  // Replay admin realtime audit events in ascending seq order.
  // GET /api/v1/admin/realtime/replay?room=admin&fromSeq=1&limit=200
  replay = async (req: Request, res: Response) => {
    if (!this.replayAuditUc) throw new Error("FEATURE_DISABLED");

    const room = toStringOpt(req.query.room) ?? "admin";
    const fromSeq = toIntStrict(req.query.fromSeq, "INVALID_FROM_SEQ");
    const limit = toInt(req.query.limit) ?? 200;

    const out = await this.replayAuditUc.execute({ room, fromSeq, limit });
    return res.json(out);
  };
}
