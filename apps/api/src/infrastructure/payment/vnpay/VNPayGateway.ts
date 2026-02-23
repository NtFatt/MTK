import crypto from "crypto";
import qs from "qs";
import type { IPaymentGateway } from "../../../application/ports/gateways/IPaymentGateway.js";
import { env } from "../../config/env.js";

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};

  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key] as string; // chốt kiểu
  }

  return sorted;
}

export class VNPayGateway implements IPaymentGateway {
  private tmnCode: string;
  private secret: string;
  private baseUrl: string;
  private configured: boolean;

  constructor() {
    // Allow boot without VNPay config (local dev).
    this.tmnCode = String(env.VNPAY_TMN_CODE ?? "");
    this.secret = String(env.VNPAY_HASH_SECRET ?? "");
    this.baseUrl = String(env.VNPAY_URL ?? "");
    this.configured = Boolean(this.tmnCode && this.secret && this.baseUrl);
  }

  createPaymentUrl(input: {
    txnRef: string;
    amount: number;
    orderInfo: string;
    returnUrl: string;
    ipnUrl: string;
  }): string {
    if (!this.configured) throw new Error("VNPAY_NOT_CONFIGURED");
    const params = sortObject({
      vnp_Version: String(env.VNPAY_VERSION ?? "2.1.0"),
      vnp_Command: String(env.VNPAY_COMMAND ?? "pay"),
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(Math.round(input.amount * 100)),
      vnp_CurrCode: String(env.VNPAY_CURR_CODE ?? "VND"),
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: String(env.VNPAY_ORDER_TYPE ?? "other"),
      vnp_ReturnUrl: input.returnUrl,
      vnp_IpnUrl: input.ipnUrl,
      vnp_Locale: String(env.VNPAY_LOCALE ?? "vn"),
      vnp_CreateDate: this.now(),
    });

    const signData = qs.stringify(params, { encode: false });
    const secureHash = crypto
      .createHmac("sha512", this.secret)
      .update(signData)
      .digest("hex");
    return `${this.baseUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  verifySignature(params: Record<string, string>): boolean {
    if (!this.configured) return false;
    const secureHash = params["vnp_SecureHash"];
    const cloned = { ...params };
    delete cloned["vnp_SecureHash"];
    delete cloned["vnp_SecureHashType"];

    const sorted = sortObject(cloned);
    const signData = qs.stringify(sorted, { encode: false });
    const hash = crypto
      .createHmac("sha512", this.secret)
      .update(signData)
      .digest("hex");
    return hash === secureHash;
  }

  private now() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    );
  }
}
