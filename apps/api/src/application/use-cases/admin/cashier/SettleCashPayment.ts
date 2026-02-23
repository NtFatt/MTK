import type { IOrderRepository, OrderStatusHistoryActor } from "../../../ports/repositories/IOrderRepository.js";
import type { IPaymentRepository } from "../../../ports/repositories/IPaymentRepository.js";
import type { ApplyPaymentSuccess } from "../../payment/ApplyPaymentSuccess.js";

type InternalActor = {
  actorType: "ADMIN" | "STAFF";
  role: string;
  branchId: string | null;
  userId: string;
  username: string;
};

export class SettleCashPayment {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly paymentRepo: IPaymentRepository,
    private readonly applyPaymentSuccess: ApplyPaymentSuccess,
  ) {}

  async execute(input: { actor: InternalActor; orderCode: string }) {
    const orderCode = String(input.orderCode || "").trim();
    if (!orderCode) throw new Error("ORDER_CODE_REQUIRED");

    // Anti-existence-leak rule (NEG-03): STAFF-side endpoints must not reveal whether an order exists in another branch.
    let scope = null as any;
    if (input.actor.actorType === "STAFF") {
      if (!input.actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      scope = await this.orderRepo.getRealtimeScopeByOrderCodeForBranch(orderCode, input.actor.branchId);
      if (!scope) throw new Error("FORBIDDEN");
    } else {
      scope = await this.orderRepo.getRealtimeScopeByOrderCode(orderCode);
      if (!scope) throw new Error("ORDER_NOT_FOUND");
    }

    const status = input.actor.actorType === "STAFF"
      ? await this.orderRepo.findStatusByOrderCodeForBranch(orderCode, String(input.actor.branchId))
      : await this.orderRepo.findStatusByOrderCode(orderCode);
    if (!status) throw new Error(input.actor.actorType === "STAFF" ? "FORBIDDEN" : "ORDER_NOT_FOUND");

    if (status.orderStatus === "PAID") {
      return { orderCode, changed: false, alreadyPaid: true };
    }
    if (status.orderStatus === "CANCELED") throw new Error("ORDER_NOT_PAYABLE");

    const provider = "CASH";
    const { txnRef } = await this.paymentRepo.createInitPayment(orderCode, {
      provider,
      txnPrefix: provider,
    });
    await this.paymentRepo.markSuccess(txnRef);

    const changedBy: { type: OrderStatusHistoryActor; id: string | null } =
      input.actor.actorType === "ADMIN"
        ? { type: "ADMIN", id: input.actor.userId }
        : { type: "STAFF", id: input.actor.userId };

    const note = `Cash settled by ${input.actor.role} (${input.actor.username}) (txnRef=${txnRef})`;
    const r = await this.applyPaymentSuccess.execute(txnRef, { provider, changedBy, note });

    return { orderCode, txnRef, changed: r.changed, alreadyPaid: false };
  }
}
