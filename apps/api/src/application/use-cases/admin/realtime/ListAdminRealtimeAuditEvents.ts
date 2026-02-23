import type { IRealtimeAdminAuditRepository } from "../../../ports/repositories/IRealtimeAdminAuditRepository.js";

export class ListAdminRealtimeAuditEvents {
  constructor(private repo: IRealtimeAdminAuditRepository) {}

  async execute(input: { room?: string; limit?: number }) {
    const limit = Math.max(1, Math.min(500, Number(input.limit ?? 100)));
    const room = input.room ?? "admin";
    const items = await this.repo.listAdminEvents({ room, limit });
    return { room, limit, items };
  }
}
