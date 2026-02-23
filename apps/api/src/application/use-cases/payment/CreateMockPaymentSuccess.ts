import type { IOrderRepository } from "../../ports/repositories/IOrderRepository.js";
import type { IPaymentRepository } from "../../ports/repositories/IPaymentRepository.js";
import type { ApplyPaymentSuccess } from "./ApplyPaymentSuccess.js";

// Dev-only helper to unblock smoke tests when VNPay isn't configured.
// It creates a payment row, marks SUCCESS, then applies order PAID + history (idempotent).
export class CreateMockPaymentSuccess {
  constructor(
    private orderRepo: IOrderRepository,
    private paymentRepo: IPaymentRepository,
    private applyPaymentSuccess: ApplyPaymentSuccess,
  ) {}

  async execute(orderCode: string) {
    const order = await this.orderRepo.findStatusByOrderCode(orderCode);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.orderStatus !== "NEW") throw new Error("ORDER_NOT_PAYABLE");

    const { paymentId, txnRef, amount } = await this.paymentRepo.createInitPayment(orderCode, {
      provider: "MOCK",
      txnPrefix: "MOCK",
    });

    await this.paymentRepo.markSuccess(txnRef);
    await this.applyPaymentSuccess.execute(txnRef, { provider: "MOCK" });

    return { orderCode, paymentId, txnRef, amount };
  }
}
