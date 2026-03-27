import type { TableStatus } from "../../../domain/entities/Table.js";
import { Table } from "../../../domain/entities/Table.js";

export interface ITableRepository {
  findAll(): Promise<Table[]>;
  /**
   * Internal/ops listing by branch.
   * NOTE: Public listing can remain global for legacy/demo.
   */
  findAllByBranch(branchId: string): Promise<Table[]>;
  findByCodeInBranch(branchId: string, code: string): Promise<Table | null>;
  findById(tableId: string): Promise<Table | null>;
  findByDirectionId(directionId: string): Promise<Table | null>;
  updateStatus(tableId: string, status: TableStatus): Promise<void>;

  create(table: Omit<Table, "id">): Promise<Table>;
  update(table: Table): Promise<void>;
  delete(tableId: string): Promise<void>;
}
