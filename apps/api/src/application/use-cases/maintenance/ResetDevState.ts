import type { IMaintenanceRepository, DevResetResult } from "../../ports/repositories/IMaintenanceRepository.js";

export type ResetDevStateInput = {
  branchId?: string | null;
  flushRedis?: boolean;
  /** DEV-only: restock deterministic to make smoke/demo consistent */
  restock?: boolean;
  restockQty?: number;
  confirm?: string;
};

export type ResetDevStateResult = {
  now: string;
  db: DevResetResult;
  redisFlushed: boolean;
};

export type ResetDevStateDeps = {
  enabled: boolean;
  flushRedis?: (() => Promise<void>) | null;
};

/**
 * DEV-ONLY: hard reset stuck state so local smoke/demo is deterministic.
 *
 * Why: NO_TABLE_AVAILABLE often comes from prior runs leaving tables/sessions/reservations in "locked" states.
 */
export class ResetDevState {
  constructor(
    private readonly repo: IMaintenanceRepository,
    private readonly deps: ResetDevStateDeps,
  ) {}

  async execute(input: ResetDevStateInput): Promise<ResetDevStateResult> {
    if (!this.deps.enabled) throw new Error("DEV_RESET_DISABLED");

    const confirm = String(input.confirm ?? "").trim().toUpperCase();
    if (confirm !== "RESET") throw new Error("CONFIRM_RESET_REQUIRED");

    const now = new Date();
    const restock = input.restock === true;
    const restockQty = input.restockQty === undefined || input.restockQty === null
      ? undefined
      : Number(input.restockQty);

    const db = await this.repo.resetDevState(now, input.branchId ?? null, {
      restock,
      restockQty: Number.isFinite(restockQty) && Number.isInteger(restockQty) ? restockQty : undefined,
    });

    let redisFlushed = false;
    if (input.flushRedis && this.deps.flushRedis) {
      try {
        await this.deps.flushRedis();
        redisFlushed = true;
      } catch {
        // Best-effort. We still return DB reset result.
      }
    }

    return { now: now.toISOString(), db, redisFlushed };
  }
}
