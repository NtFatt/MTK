import type { Request, Response } from "express";
import { z } from "zod";
import type { GetBranchDashboardOverview } from "../../../application/use-cases/admin/dashboard/GetBranchDashboardOverview.js";

const QuerySchema = z.object({
  branchId: z
    .union([z.string().min(1), z.number().int().positive()])
    .optional()
    .transform((value) => (value === undefined ? undefined : String(value))),
});

export class AdminDashboardController {
  constructor(private readonly getOverviewUc: GetBranchDashboardOverview) {}

  private actorFrom(res: Response) {
    const internal = (res.locals as any).internal;
    if (!internal) throw new Error("INVALID_TOKEN");

    return {
      actorType: internal.actorType as "ADMIN" | "STAFF",
      role: String(internal.role ?? ""),
      branchId:
        internal.branchId !== undefined && internal.branchId !== null
          ? String(internal.branchId)
          : null,
    };
  }

  overview = async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);
    const actor = this.actorFrom(res);

    const data = await this.getOverviewUc.execute({
      actor,
      branchId: q.branchId ?? null,
    });

    return res.json(data);
  };
}
