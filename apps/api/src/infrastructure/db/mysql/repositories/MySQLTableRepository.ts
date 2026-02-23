import type { ITableRepository } from "../../../../application/ports/repositories/ITableRepository.js";
import { Table, type TableStatus } from "../../../../domain/entities/Table.js";
import { pool } from "../connection.js";

export class MySQLTableRepository implements ITableRepository {
  async findAll(): Promise<Table[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       ORDER BY table_code ASC`
    );

    return rows.map((r) => new Table(
      String(r.table_id),
      r.table_code,
      r.table_status as TableStatus,
      r.direction_id,
      r.seats,
      r.area_name,
      String(r.branch_id)
    ));
  }

  async findAllByBranch(branchId: string): Promise<Table[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE branch_id = ?
       ORDER BY table_code ASC`,
      [String(branchId)],
    );

    return rows.map((r) => new Table(
      String(r.table_id),
      r.table_code,
      r.table_status as TableStatus,
      r.direction_id,
      r.seats,
      r.area_name,
      String(r.branch_id)
    ));
  }

  async findById(tableId: string): Promise<Table | null> {
    const [rows] = await pool.query<any[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE table_id = ?
       LIMIT 1`,
      [tableId]
    );

    const r = rows?.[0];
    if (!r) return null;

    return new Table(
      String(r.table_id),
      r.table_code,
      r.table_status as TableStatus,
      r.direction_id,
      r.seats,
      r.area_name,
      String(r.branch_id)
    );
  }

  async findByDirectionId(directionId: string): Promise<Table | null> {
    const [rows] = await pool.query<any[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE direction_id = ?
       LIMIT 1`,
      [directionId]
    );

    const r = rows?.[0];
    if (!r) return null;

    return new Table(
      String(r.table_id),
      r.table_code,
      r.table_status as TableStatus,
      r.direction_id,
      r.seats,
      r.area_name,
      String(r.branch_id)
    );
  }

  async updateStatus(tableId: string, status: TableStatus): Promise<void> {
    await pool.query(
      `UPDATE restaurant_tables SET table_status = ? WHERE table_id = ?`,
      [status, tableId]
    );
  }
}
