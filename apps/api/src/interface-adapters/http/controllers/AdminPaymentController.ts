import type { Request, Response } from "express";
import type { CreateMockPaymentSuccess } from "../../../application/use-cases/payment/CreateMockPaymentSuccess.js";
import { env } from "../../../infrastructure/config/env.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

export class AdminPaymentController {
  constructor(private mockSuccessUc: CreateMockPaymentSuccess) {}

  // Admin-only. Dev/test only by default. Use to simulate a payment success without VNPay.
  mockSuccess = async (req: Request, res: Response) => {
    if (env.NODE_ENV === "production") throw new Error("FEATURE_DISABLED");

    const orderCode = mustString(req.params.orderCode as unknown, "ORDER_CODE");
    const out = await this.mockSuccessUc.execute(orderCode);
    return res.status(201).json(out);
  };
}
