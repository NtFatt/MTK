import type { IMaintenanceRepository, MaintenanceRunResult } from "../../ports/repositories/IMaintenanceRepository.js";

export class RunMaintenanceJobs {
  constructor(private repo: IMaintenanceRepository) {}

  async execute(input: {
    branchId?: string | null;
    lockAheadMinutes: number;
    noShowGraceMinutes: number;
    sessionStaleMinutes: number;
  }): Promise<MaintenanceRunResult> {
    const now = new Date();

    const expiredPendingReservations = await this.repo.expirePendingReservations(now);
    const markedNoShowReservations = await this.repo.markNoShowReservations(now, input.noShowGraceMinutes);
    const completedReservations = await this.repo.completeCheckedInReservations(now);
    const closedStaleSessions = await this.repo.closeStaleSessions(now, input.sessionStaleMinutes);
    const tableStatus = await this.repo.syncTableStatuses(now, input.lockAheadMinutes, input.branchId ?? null);

    return {
      now: now.toISOString(),
      expiredPendingReservations,
      markedNoShowReservations,
      completedReservations,
      closedStaleSessions,
      tableStatus,
    };
  }
}
