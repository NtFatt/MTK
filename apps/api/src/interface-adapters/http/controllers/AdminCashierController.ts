import type { Request, Response } from "express";
import { z } from "zod";
import type { ListUnpaidOrders } from "../../../application/use-cases/admin/cashier/ListUnpaidOrders.js";
import type { SettleCashPayment } from "../../../application/use-cases/admin/cashier/SettleCashPayment.js";

const QuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).optional().transform((v) => (v === undefined ? undefined : String(v))),
  limit: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : Number(v))),
});

export class AdminCashierController {
  constructor(
    private readonly listUnpaidUc: ListUnpaidOrders,
    private readonly settleCashUc: SettleCashPayment,
  ) {}

  private actorFrom(res: Response) {
    const internal = (res.locals as any).internal;
    if (!internal) throw new Error("INVALID_TOKEN");
    return {
      actorType: internal.actorType as "ADMIN" | "STAFF",
      role: String(internal.role ?? ""),
      branchId: internal.branchId !== undefined && internal.branchId !== null ? String(internal.branchId) : null,
      userId: String(internal.userId ?? internal.sub ?? ""),
      username: String(internal.username ?? ""),
    };
  }

  listUnpaid = async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);
    const actor = this.actorFrom(res);

    const items = await this.listUnpaidUc.execute({
      actor,
      branchId: q.branchId ?? null,
      limit: q.limit ?? null,
    });

    return res.json({ items });
  };

  settleCash = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const orderCode = String(req.params?.orderCode ?? "").trim();
    if (!orderCode) throw new Error("ORDER_CODE_REQUIRED");

    const out = await this.settleCashUc.execute({ actor, orderCode });
    return res.status(out.changed ? 201 : 200).json(out);
  };
}
