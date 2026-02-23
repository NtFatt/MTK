import type { OrderStatus } from "../../../../domain/entities/Order.js";
import type { IOrderQueryRepository } from "../../../ports/repositories/IOrderQueryRepository.js";

type Actor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
};

export class ListKitchenQueue {
  constructor(private readonly repo: IOrderQueryRepository) {}

  async execute(input: {
    actor: Actor;
    branchId?: string | null;
    statuses?: OrderStatus[] | null;
    limit?: number | null;
  }) {
    let branchId = input.branchId ?? null;

    // Staff-side tokens are ALWAYS branch-scoped.
    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = input.actor.branchId;
    }

    const statuses = (input.statuses ?? undefined) as OrderStatus[] | undefined;
    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 50))));

    return this.repo.listKitchenQueue({
      branchId,
      statuses: statuses ?? ([] as any),
      limit,
    });
  }
}
