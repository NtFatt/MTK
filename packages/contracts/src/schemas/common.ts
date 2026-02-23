import { z } from "zod";

/**
 * common.ts
 *
 * Đây là "skeleton" — ưu tiên:
 * - Không bịa field; dùng minimal + permissive.
 * - Khi có OpenAPI (Orval), tighten lại thành strict.
 */

export const zId = z.union([z.string(), z.number()]);

export const zIsoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO datetime");

export const zMoney = z.number().nonnegative();

export const zPaginationMeta = z
  .object({
    page: z.number().int().nonnegative().optional(),
    size: z.number().int().positive().optional(),
    total: z.number().int().nonnegative().optional(),
  })
  .partial();

export const zApiMeta = z
  .object({
    requestId: z.string().optional(),
    pagination: zPaginationMeta.optional(),
  })
  .partial();

export const zApiEnvelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      data: dataSchema,
      meta: zApiMeta.optional(),
    })
    .partial({ meta: true });
