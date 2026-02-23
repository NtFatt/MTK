import type { Request, Response } from "express";
import { z } from "zod";
import type { ListKitchenQueue } from "../../../application/use-cases/admin/kitchen/ListKitchenQueue.js";
import type { OrderStatus } from "../../../domain/entities/Order.js";

const QuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).optional().transform((v) => (v === undefined ? undefined : String(v))),
  limit: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : Number(v))),
  statuses: z.string().optional(),
});

function parseStatuses(raw?: string): OrderStatus[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase());
  return parts as any;
}

export class AdminKitchenController {
  constructor(private readonly listQueueUc: ListKitchenQueue) {}

  private actorFrom(res: Response) {
    const internal = (res.locals as any).internal;
    if (!internal) throw new Error("INVALID_TOKEN");
    return {
      actorType: internal.actorType as "ADMIN" | "STAFF",
      role: String(internal.role ?? ""),
      branchId: internal.branchId !== undefined && internal.branchId !== null ? String(internal.branchId) : null,
    };
  }

  listQueue = async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);
    const actor = this.actorFrom(res);

    const items = await this.listQueueUc.execute({
      actor,
      branchId: q.branchId ?? null,
      limit: q.limit ?? null,
      statuses: parseStatuses(q.statuses) ?? null,
    });

    return res.json({ items });
  };
}
