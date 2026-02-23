import type { IMaintenanceRepository, TableStatusCounts } from "../../ports/repositories/IMaintenanceRepository.js";

export class SyncTableStatuses {
  constructor(private repo: IMaintenanceRepository) {}

  async execute(params: { now: Date; lockAheadMinutes: number; branchId?: string | null }): Promise<TableStatusCounts> {
    return this.repo.syncTableStatuses(params.now, params.lockAheadMinutes, params.branchId ?? null);
  }
}
