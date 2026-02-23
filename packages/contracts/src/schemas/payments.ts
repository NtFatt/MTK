import { z } from "zod";

/**
 * payments.ts
 *
 * Endpoints:
 * - POST /api/v1/payments/vnpay/create/:orderCode
 * - GET  /api/v1/payments/vnpay/return
 * - GET  /api/v1/payments/vnpay/ipn
 */

export const zVnpayCreateResponse = z
  .object({
    paymentUrl: z.string().url().optional(),
    url: z.string().url().optional(),
  })
  .partial();

export const zVnpayReturnQuery = z
  .record(z.string(), z.string())
  .optional();
