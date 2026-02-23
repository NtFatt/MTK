import type { IRealtimeAdminAuditRepository } from "../../../ports/repositories/IRealtimeAdminAuditRepository.js";

export class ReplayAdminRealtimeAuditEvents {
  constructor(private repo: IRealtimeAdminAuditRepository) {}

  async execute(input: { room?: string; fromSeq: number; limit?: number }) {
    const room = input.room ?? "admin";
    const fromSeq = Math.max(0, Number(input.fromSeq));
    if (!Number.isFinite(fromSeq) || !Number.isInteger(fromSeq)) throw new Error("INVALID_FROM_SEQ");

    const limit = Math.max(1, Math.min(500, Number(input.limit ?? 200)));

    const items = await this.repo.listAdminEvents({ room, limit, fromSeq, direction: "asc" });
    const lastSeq = items.length > 0 ? items[items.length - 1]!.seq : (fromSeq - 1);

    return {
      room,
      fromSeq,
      limit,
      items,
      nextFromSeq: lastSeq + 1,
    };
  }
}
