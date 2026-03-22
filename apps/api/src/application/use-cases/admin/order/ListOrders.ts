import type { OrderStatus } from "../../../../domain/entities/Order.js";
import type { IOrderQueryRepository } from "../../../ports/repositories/IOrderQueryRepository.js";

type Actor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
};

export class ListOrders {
  constructor(private readonly repo: IOrderQueryRepository) {}

  async execute(input: {
    actor: Actor;
    branchId?: string | null;
    statuses?: OrderStatus[] | null;
    q?: string | null;
    limit?: number | null;
  }) {
    let branchId = input.branchId ?? null;

    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      branchId = input.actor.branchId;
    }

    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 100))));
    const q = String(input.q ?? "").trim();

    return this.repo.listOrders({
      branchId,
      ...(input.statuses != null ? { statuses: input.statuses as OrderStatus[] } : {}),
      q: q || null,
      limit,
    });
  }
}
