import type { Request, Response } from "express";
import type { RunMaintenanceJobs } from "../../../application/use-cases/maintenance/RunMaintenanceJobs.js";
import type { SyncTableStatuses } from "../../../application/use-cases/maintenance/SyncTableStatuses.js";
import type { ResetDevState } from "../../../application/use-cases/maintenance/ResetDevState.js";
import type { SetDevStock } from "../../../application/use-cases/maintenance/SetDevStock.js";

function toInt(raw: unknown, errCode: string): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(errCode);
  return n;
}

function toStringOpt(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return String(raw);
}

export class AdminMaintenanceController {
  constructor(
    private runUc: RunMaintenanceJobs,
    private syncUc: SyncTableStatuses,
    private resetUc: ResetDevState,
    private setStockUc: SetDevStock,
    private defaults: {
      lockAheadMinutes: number;
      noShowGraceMinutes: number;
      sessionStaleMinutes: number;
    },
  ) {}

  run = async (req: Request, res: Response) => {
    const branchId = toStringOpt(req.query.branchId);
    const lockAheadMinutes = toInt(req.query.lockAheadMinutes, "INVALID_LOCK_AHEAD_MINUTES") ?? this.defaults.lockAheadMinutes;
    const noShowGraceMinutes = toInt(req.query.noShowGraceMinutes, "INVALID_NO_SHOW_GRACE_MINUTES") ?? this.defaults.noShowGraceMinutes;
    const sessionStaleMinutes = toInt(req.query.sessionStaleMinutes, "INVALID_SESSION_STALE_MINUTES") ?? this.defaults.sessionStaleMinutes;

    const out = await this.runUc.execute({
      branchId: branchId ?? null,
      lockAheadMinutes,
      noShowGraceMinutes,
      sessionStaleMinutes,
    });

    return res.json(out);
  };

  syncTableStatus = async (req: Request, res: Response) => {
    const branchId = toStringOpt(req.query.branchId);
    const lockAheadMinutes = toInt(req.query.lockAheadMinutes, "INVALID_LOCK_AHEAD_MINUTES") ?? this.defaults.lockAheadMinutes;

    const out = await this.syncUc.execute({
      now: new Date(),
      lockAheadMinutes,
      branchId: branchId ?? null,
    });

    return res.json({ now: new Date().toISOString(), tableStatus: out });
  };

  resetDevState = async (req: Request, res: Response) => {
    const branchId = toStringOpt(req.query.branchId);

    const flushRaw = (req.query.flushRedis ?? (req.body as any)?.flushRedis ?? "") as any;
    const flushRedis = String(flushRaw).toLowerCase() === "true" || String(flushRaw) === "1";

    const confirm = String(((req.body as any)?.confirm ?? req.query.confirm ?? "") as any);

    const restockRaw = (req.query.restock ?? (req.body as any)?.restock ?? "") as any;
    const restock = String(restockRaw).toLowerCase() === "true" || String(restockRaw) === "1";
    const restockQty = toInt(req.query.restockQty ?? (req.body as any)?.restockQty, "INVALID_RESTOCK_QTY");

    const out = await this.resetUc.execute({
      branchId: branchId ?? null,
      flushRedis,
      restock,
      restockQty,
      confirm,
    });

    return res.json(out);
  };

  setDevStock = async (req: Request, res: Response) => {
    const body: any = req.body ?? {};
    const branchId = String(body.branchId ?? "");
    const itemId = String(body.itemId ?? "");
    const quantity = Number(body.quantity ?? body.qty ?? 0);

    if (!branchId) return res.status(400).json({ code: "INVALID_BRANCH_ID" });
    if (!itemId) return res.status(400).json({ code: "INVALID_ITEM_ID" });
    if (!Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ code: "INVALID_QUANTITY" });

    const out = await this.setStockUc.exec({ branchId, itemId, quantity });
    return res.json(out);
  };
}
