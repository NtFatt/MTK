import type { Request, Response } from "express";
import { z } from "zod";
import type { Table } from "../../../domain/entities/Table.js";

import type { CreateTable } from "../../../application/use-cases/admin/ops/CreateTable.js";
import type { UpdateTable } from "../../../application/use-cases/admin/ops/UpdateTable.js";
import type { DeleteTable } from "../../../application/use-cases/admin/ops/DeleteTable.js";

const BranchIdSchema = z.union([z.string().trim().min(1), z.number().int().positive()]).transform(String);

const CreateTableBody = z.object({
  branchId: BranchIdSchema,
  code: z.string().trim().min(1),
  seats: z.coerce.number().int().min(1),
  areaName: z.string().trim().nullable().optional(),
});

const UpdateTableBody = z.object({
  branchId: BranchIdSchema,
  code: z.string().trim().min(1),
  seats: z.coerce.number().int().min(1),
  areaName: z.string().trim().nullable().optional(),
});

const DeleteTableParams = z.object({
  tableId: z.string().trim().min(1),
});

const DeleteTableQuery = z.object({
  branchId: BranchIdSchema,
});

function toTableResponse(table: Table) {
  return {
    id: String(table.id),
    branchId: table.branchId != null ? String(table.branchId) : undefined,
    code: table.code,
    status: table.status,
    directionId: table.directionId,
    seats: table.seats,
    areaName: table.areaName ?? null,
  };
}

export class AdminTableController {
  constructor(
    private readonly createTableUc: CreateTable,
    private readonly updateTableUc: UpdateTable,
    private readonly deleteTableUc: DeleteTable,
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

  createTable = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const body = CreateTableBody.parse(req.body);

    const table = await this.createTableUc.execute({
      actor,
      branchId: body.branchId,
      code: body.code,
      seats: body.seats,
      areaName: body.areaName ?? null,
    });

    return res.status(201).json(toTableResponse(table));
  };

  updateTable = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const tableId = req.params?.tableId?.trim();
    if (!tableId) throw new Error("TABLE_ID_REQUIRED");
    
    const body = UpdateTableBody.parse(req.body);

    const table = await this.updateTableUc.execute({
      actor,
      branchId: body.branchId,
      tableId,
      code: body.code,
      seats: body.seats,
      areaName: body.areaName ?? null,
    });

    return res.json(toTableResponse(table));
  };

  deleteTable = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const params = DeleteTableParams.parse(req.params);
    const query = DeleteTableQuery.parse(req.query);

    await this.deleteTableUc.execute({
      actor,
      branchId: query.branchId,
      tableId: params.tableId,
    });

    return res.status(204).send();
  };
}
