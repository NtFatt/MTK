import type { ITableRepository } from "../../../ports/repositories/ITableRepository.js";
import type { IOpsTableOrderSummaryRepository } from "../../../ports/repositories/IOpsTableOrderSummaryRepository.js";

type Actor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
};

export class ListBranchTables {
  constructor(
    private readonly repo: ITableRepository,
    private readonly summaryRepo: IOpsTableOrderSummaryRepository,
  ) {}

  async execute(input: {
    actor: Actor;
    branchId?: string | null;
  }) {
    let branchId = input.branchId ?? null;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = input.actor.branchId;
    }

    const rows = branchId ? await this.repo.findAllByBranch(branchId) : await this.repo.findAll();

    // chỉ enrich khi có branchId (ops screen luôn có)
    const summaries =
      branchId && rows.length
        ? await this.summaryRepo.getActiveSummaryByTableIds({
            branchId,
            tableIds: rows.map((t) => String(t.id)),
          })
        : {};

    return rows.map((t) => {
      const s = summaries[String(t.id)];

      return {
        tableId: t.id,
        branchId: t.branchId,
        code: t.code,
        areaName: t.areaName,
        seats: t.seats,
        tableStatus: t.status,
        directionId: t.directionId,

        // NEW: món khách gọi (active orders)
        activeOrdersCount: s?.activeOrdersCount ?? 0,
        activeOrderCode: s?.activeOrderCode ?? null,
        activeOrderStatus: s?.activeOrderStatus ?? null,
        activeOrderUpdatedAt: s?.activeOrderUpdatedAt ?? null,
        activeItemsCount: s?.activeItemsCount ?? null,
        activeItemsTop: s?.activeItemsTop ?? null,
        activeItemsPreview: s?.activeItemsPreview ?? null,
      };
    });
  }
}