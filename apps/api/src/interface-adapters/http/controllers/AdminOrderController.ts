import type { Request, Response } from "express";
import { z } from "zod";
import type { ChangeOrderStatus } from "../../../application/use-cases/admin/ChangeOrderStatus.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

const BodySchema = z.object({
  toStatus: z.enum(["RECEIVED", "READY", "COMPLETED", "CANCELED", "PAID"]),
  note: z.string().max(200).optional().nullable(),
});

export class AdminOrderController {
  constructor(private changeOrderStatus: ChangeOrderStatus) {}

  changeStatus = async (req: Request, res: Response) => {
    const orderCode = mustString(req.params.orderCode as unknown, "ORDER_CODE");
    const body = BodySchema.parse(req.body);

    const auth = (res.locals as any).internal;
    if (!auth?.userId || !auth?.role || !auth?.actorType) throw new Error("UNAUTHORIZED");

    const out = await this.changeOrderStatus.execute({
      orderCode,
      toStatus: body.toStatus,
      note: body.note ?? null,
      actor: {
        actorType: auth.actorType,
        userId: String(auth.userId),
        role: String(auth.role),
        branchId: auth.branchId !== undefined ? (auth.branchId === null ? null : String(auth.branchId)) : null,
      },
    });

    return res.json(out);
  };
}
