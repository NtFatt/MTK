import type { Request, Response } from "express";
import { z } from "zod";
import type { ListPublicVouchers } from "../../../application/use-cases/voucher/ListPublicVouchers.js";

const QuerySchema = z.object({
  cartKey: z.string().trim().min(1),
});

export class VoucherController {
  constructor(private readonly listPublicVouchersUc: ListPublicVouchers) {}

  listPublic = async (req: Request, res: Response) => {
    const query = QuerySchema.parse(req.query);
    const out = await this.listPublicVouchersUc.execute({
      cartKey: query.cartKey,
    });
    return res.json(out);
  };
}
