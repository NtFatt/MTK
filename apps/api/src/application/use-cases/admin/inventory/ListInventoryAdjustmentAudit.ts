import type { IAuditLogRepository } from "../../../ports/repositories/IAuditLogRepository.js";

export class ListInventoryAdjustmentAudit {
  constructor(private readonly auditRepo: IAuditLogRepository) {}

  async execute(input: {
    actor: { role: string; branchId: string | null };
    branchId?: string | null;
    itemId?: string | null;
    actorId?: string | null;
    mode?: string | null;
    from?: string | null;
    to?: string | null;
    limit?: number;
    beforeAuditId?: string | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    let branchId = input.branchId ? String(input.branchId) : null;

    if (actorRole !== "ADMIN") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = String(input.actor.branchId);
    }

    if (!branchId) throw new Error("BRANCH_REQUIRED");

    return this.auditRepo.listInventoryAdjustmentAudit({
      branchId,
      itemId: input.itemId ? String(input.itemId) : null,
      actorId: input.actorId ? String(input.actorId) : null,
      mode: input.mode ? String(input.mode).toUpperCase() : null,
      from: input.from ?? null,
      to: input.to ?? null,
      limit: Math.max(1, Math.min(200, Number(input.limit ?? 50))),
      beforeAuditId: input.beforeAuditId ? String(input.beforeAuditId) : null,
    });
  }
}