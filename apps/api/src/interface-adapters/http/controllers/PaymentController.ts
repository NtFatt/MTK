import type { Request, Response } from "express";
import type { CreateVNPayPayment } from "../../../application/use-cases/payment/CreateVNPayPayment.js";
import type { ApplyPaymentSuccess } from "../../../application/use-cases/payment/ApplyPaymentSuccess.js";
import type { VNPayGateway } from "../../../infrastructure/payment/vnpay/VNPayGateway.js";
import type { IPaymentRepository } from "../../../application/ports/repositories/IPaymentRepository.js";
import type { IVNPayLogRepository } from "../../../application/ports/repositories/IVNPayLogRepository.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`INVALID_${field}`);
  return v;
}

export class PaymentController {
  constructor(
    private createVNPayPayment: CreateVNPayPayment,
    private gateway: VNPayGateway,
    private paymentRepo: IPaymentRepository,
    private vnpayLogRepo: IVNPayLogRepository,
    private applyPaymentSuccess: ApplyPaymentSuccess,
  ) {}

  createVNPay = async (req: Request, res: Response) => {
    const orderCode = mustString(req.params.orderCode as unknown, "ORDER_CODE");
    const out = await this.createVNPayPayment.execute(orderCode);
    return res.json(out);
  };

  vnpReturn = async (req: Request, res: Response) => {
    const params = Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
    ) as Record<string, string>;

    // For RETURN, keep UX-friendly behavior: invalid signature -> 400.
    if (!this.gateway.verifySignature({ ...params })) return res.status(400).send("Invalid signature");

    const txnRef = params.vnp_TxnRef;
    if (txnRef) {
      const paymentId = await this.paymentRepo.findPaymentIdByTxnRef(txnRef);
      if (paymentId) {
        await this.vnpayLogRepo.upsertLog({
          paymentId,
          logType: "RETURN",
          vnpTxnRef: txnRef,
          vnpResponseCode: params.vnp_ResponseCode ?? null,
          vnpTransactionNo: params.vnp_TransactionNo ?? null,
          vnpSecureHash: params.vnp_SecureHash ?? null,
          rawQuery: req.originalUrl ?? null,
        });
      }

      if (params.vnp_ResponseCode === "00") {
        // Idempotent update.
        await this.paymentRepo.markSuccess(txnRef);
        // Best-effort: RETURN may be missing while IPN is canonical.
        try {
          await this.applyPaymentSuccess.execute(txnRef, { provider: "VNPAY" });
        } catch {
          // swallow - IPN will retry (canonical)
        }
      } else {
        await this.paymentRepo.markFailed(txnRef);
      }
    }

    return res.status(200).send("VNPay RETURN OK");
  };

  vnpIpn = async (req: Request, res: Response) => {
    const params = Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
    ) as Record<string, string>;

    if (!this.gateway.verifySignature({ ...params })) {
      return res.json({ RspCode: "97", Message: "Invalid signature" });
    }

    const txnRef = params.vnp_TxnRef;
    if (!txnRef) return res.json({ RspCode: "01", Message: "Missing vnp_TxnRef" });

    const paymentId = await this.paymentRepo.findPaymentIdByTxnRef(txnRef);
    if (!paymentId) return res.json({ RspCode: "01", Message: "Unknown vnp_TxnRef" });

    await this.vnpayLogRepo.upsertLog({
      paymentId,
      logType: "IPN",
      vnpTxnRef: txnRef,
      vnpResponseCode: params.vnp_ResponseCode ?? null,
      vnpTransactionNo: params.vnp_TransactionNo ?? null,
      vnpSecureHash: params.vnp_SecureHash ?? null,
      rawQuery: req.originalUrl ?? null,
    });

    // NOTE: IPN contract is special - MUST respond with VNPay's expected schema.
    try {
      if (params.vnp_ResponseCode === "00") {
        await this.paymentRepo.markSuccess(txnRef);
        await this.applyPaymentSuccess.execute(txnRef, { provider: "VNPAY" });
      } else {
        await this.paymentRepo.markFailed(txnRef);
      }

      return res.json({ RspCode: "00", Message: "OK" });
    } catch {
      return res.json({ RspCode: "99", Message: "Internal error" });
    }
  };
}
