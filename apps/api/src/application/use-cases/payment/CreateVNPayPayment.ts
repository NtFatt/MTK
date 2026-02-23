import type { IPaymentGateway } from "../../ports/gateways/IPaymentGateway.js";
import type { IOrderRepository } from "../../ports/repositories/IOrderRepository.js";
import type { IPaymentRepository } from "../../ports/repositories/IPaymentRepository.js";
import { env } from "../../../infrastructure/config/env.js";

export class CreateVNPayPayment {
  constructor(
    private orderRepo: IOrderRepository,
    private paymentRepo: IPaymentRepository,
    private gateway: IPaymentGateway
  ) {}

  async execute(orderCode: string) {
    const order = await this.orderRepo.findStatusByOrderCode(orderCode);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.orderStatus !== "NEW") throw new Error("ORDER_NOT_PAYABLE");

    const { paymentId, txnRef, amount } = await this.paymentRepo.createInitPayment(orderCode, {
      provider: "VNPAY",
      txnPrefix: "VNP",
    });

    const returnUrl = env.VNPAY_RETURN_URL ?? `${env.BASE_URL}/api/v1/payments/vnpay/return`;
    const ipnUrl = env.VNPAY_IPN_URL ?? `${env.BASE_URL}/api/v1/payments/vnpay/ipn`;

    const paymentUrl = this.gateway.createPaymentUrl({
      txnRef,
      amount,
      orderInfo: `Thanh toan don ${orderCode}`,
      returnUrl,
      ipnUrl,
    });

    await this.paymentRepo.markRedirected(paymentId);
    return { paymentUrl };
  }
}
