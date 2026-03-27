import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";
import { Table } from "../../../../domain/entities/Table.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class UpdateTable {
  constructor(
    private readonly tableRepo: ITableRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    tableId: string;
    code: string;
    seats: number;
    areaName: string | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);

    if (!scopedBranchId) throw new Error("TABLE_BRANCH_REQUIRED");

    const existing = await this.tableRepo.findById(input.tableId);
    if (!existing) throw new Error("TABLE_NOT_FOUND");
    if (existing.branchId !== scopedBranchId) throw new Error("FORBIDDEN");

    const code = input.code.trim();
    if (!code) throw new Error("TABLE_CODE_REQUIRED");
    const seats = Number(input.seats);
    if (!Number.isInteger(seats) || seats <= 0) throw new Error("TABLE_INVALID_SEATS");

    const duplicate = await this.tableRepo.findByCodeInBranch(scopedBranchId, code);
    if (duplicate && duplicate.id !== existing.id) throw new Error("TABLE_CODE_ALREADY_EXISTS");

    const updated = new Table(
      existing.id,
      code,
      existing.status,
      code,
      seats,
      input.areaName?.trim() ? input.areaName.trim() : null,
      existing.branchId,
    );

    await this.tableRepo.update(updated);

    await this.eventBus.publish({
      type: "table.setup.changed",
      at: new Date().toISOString(),
      scope: { branchId: scopedBranchId },
      payload: { action: "update", tableId: updated.id, code: updated.code },
    });

    return updated;
  }
}
