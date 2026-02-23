import type { Request, Response } from "express";
import type { GetTables } from "../../../application/use-cases/table/GetTables.js";
import type { GetTableByDirection } from "../../../application/use-cases/table/GetTableByDirection.js";

function mustDirectionId(v: unknown): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error("INVALID_DIRECTION_ID");
  return v.trim();
}

export class TableController {
  constructor(
    private getTables: GetTables,
    private getTableByDirection: GetTableByDirection,
  ) {}

  getAll = async (_req: Request, res: Response) => {
    const data = await this.getTables.execute();
    return res.json(data);
  };

  getByDirection = async (req: Request, res: Response) => {
    const raw = (req.params.directionId ?? req.query.directionId) as unknown;
    const directionId = mustDirectionId(raw);

    const table = await this.getTableByDirection.execute(directionId);
    if (!table) throw new Error("TABLE_NOT_FOUND");

    return res.json(table);
  };
}
