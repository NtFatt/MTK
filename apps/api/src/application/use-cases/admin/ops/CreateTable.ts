import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";
import { Table } from "../../../../domain/entities/Table.js";
import type { IEventBus } from "../../../ports/events/IEventBus.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class CreateTable {
  constructor(
    private readonly tableRepo: ITableRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: {
    actor: InternalActor;
    branchId: string;
    code: string;
    seats: number;
    areaName: string | null;
  }) {
    const actorRole = String(input.actor.role ?? "").toUpperCase();
    const scopedBranchId =
      actorRole === "BRANCH_MANAGER" ? String(input.actor.branchId ?? "") : String(input.branchId);

    if (!scopedBranchId) throw new Error("TABLE_BRANCH_REQUIRED");

    const code = input.code.trim();
    if (!code) throw new Error("TABLE_CODE_REQUIRED");

    const seats = Number(input.seats);
    if (!Number.isInteger(seats) || seats <= 0) throw new Error("TABLE_INVALID_SEATS");

    const duplicate = await this.tableRepo.findByCodeInBranch(scopedBranchId, code);
    if (duplicate) throw new Error("TABLE_CODE_ALREADY_EXISTS");

    const areaName = input.areaName?.trim() ? input.areaName.trim() : null;

    const tableData: Omit<Table, "id"> = {
      branchId: scopedBranchId,
      code,
      status: "AVAILABLE",
      directionId: code,
      seats,
      areaName,
    };

    const table = await this.tableRepo.create(tableData);

    await this.eventBus.publish({
      type: "table.setup.changed",
      at: new Date().toISOString(),
      scope: { branchId: scopedBranchId },
      payload: { action: "create", tableId: table.id, code: table.code },
    });

    return table;
  }
}
