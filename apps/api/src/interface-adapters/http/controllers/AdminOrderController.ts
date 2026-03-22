import type { Request, Response } from "express";
import { z } from "zod";
import type { ListOrders } from "../../../application/use-cases/admin/order/ListOrders.js";
import type { ChangeOrderStatus } from "../../../application/use-cases/admin/ChangeOrderStatus.js";
import type { OrderStatus } from "../../../domain/entities/Order.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

const BodySchema = z.object({
  toStatus: z.enum(["RECEIVED", "PREPARING", "READY", "COMPLETED", "CANCELED", "PAID"]),
  note: z.string().max(200).optional().nullable(),
  kitchenStatusScope: z.enum(["NEW", "RECEIVED", "PREPARING"]).optional().nullable(),
});

const QuerySchema = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((value) => (value === undefined ? undefined : String(value))),
  limit: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : Number(v))),
  statuses: z.string().optional(),
  q: z.string().optional(),
});

function parseStatuses(raw?: string): OrderStatus[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toUpperCase());
  return parts as OrderStatus[];
}

export class AdminOrderController {
  constructor(
    private readonly listOrdersUc: ListOrders,
    private readonly changeOrderStatus: ChangeOrderStatus,
  ) {}

  private actorFrom(res: Response) {
    const auth = (res.locals as any).internal;
    if (!auth?.userId || !auth?.role || !auth?.actorType) throw new Error("UNAUTHORIZED");

    return {
      actorType: auth.actorType as "ADMIN" | "STAFF",
      role: String(auth.role),
      branchId: auth.branchId !== undefined ? (auth.branchId === null ? null : String(auth.branchId)) : null,
      userId: String(auth.userId),
    };
  }

  listOrders = async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);
    const actor = this.actorFrom(res);

    const items = await this.listOrdersUc.execute({
      actor,
      branchId: q.branchId ?? null,
      limit: q.limit ?? null,
      statuses: parseStatuses(q.statuses) ?? null,
      q: q.q ?? null,
    });

    return res.json({ items });
  };

  changeStatus = async (req: Request, res: Response) => {
    const orderCode = mustString(req.params.orderCode as unknown, "ORDER_CODE");
    const body = BodySchema.parse(req.body);

    const actor = this.actorFrom(res);

    const out = await this.changeOrderStatus.execute({
      orderCode,
      toStatus: body.toStatus,
      note: body.note ?? null,
      kitchenStatusScope: body.kitchenStatusScope ?? null,
      actor: {
        actorType: actor.actorType,
        userId: actor.userId,
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    return res.json(out);
  };
}
