import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";
import type { ITableSessionRepository } from "../../../ports/repositories/ITableSessionRepository.js";
import type { IOrderRepository } from "../../../ports/repositories/IOrderRepository.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class DeleteTable {
  constructor(
    private readonly tableRepo: ITableRepository,
    private readonly sessionRepo: ITableSessionRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    tableId: string;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);

    if (!scopedBranchId) throw new Error("TABLE_BRANCH_REQUIRED");

    const existing = await this.tableRepo.findById(input.tableId);
    if (!existing) throw new Error("TABLE_NOT_FOUND");
    if (existing.branchId !== scopedBranchId) throw new Error("FORBIDDEN");

    const openSession = await this.sessionRepo.findOpenByTableId(existing.id);
    if (openSession) throw new Error("TABLE_HAS_OPEN_SESSION");

    const unpaidConflict = await this.orderRepo.findUnpaidDineInConflictByTableId(existing.id);
    if ((unpaidConflict?.count ?? 0) > 0) throw new Error("TABLE_HAS_UNPAID_ORDERS");

    if (existing.status === "OCCUPIED" || existing.status === "RESERVED") {
      throw new Error("TABLE_IN_USE");
    }

    await this.tableRepo.delete(input.tableId);

    await this.eventBus.publish({
      type: "table.setup.changed",
      at: new Date().toISOString(),
      scope: { branchId: scopedBranchId },
      payload: { action: "delete", tableId: input.tableId, code: existing.code },
    });
  }
}
