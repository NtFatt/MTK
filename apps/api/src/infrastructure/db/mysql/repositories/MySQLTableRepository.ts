import type { RowDataPacket } from "mysql2/promise";
import type { ITableRepository } from "../../../../application/ports/repositories/ITableRepository.js";
import { Table, type TableStatus } from "../../../../domain/entities/Table.js";
import { pool } from "../connection.js";

type TableRow = RowDataPacket & {
  table_id: string | number;
  branch_id: string | number | null;
  table_code: string;
  table_status: TableStatus;
  direction_id: string | null;
  seats: number;
  area_name: string | null;
};

function mapTableRow(row: TableRow): Table {
  return new Table(
    String(row.table_id),
    String(row.table_code),
    row.table_status,
    String(row.direction_id ?? row.table_code),
    Number(row.seats ?? 0),
    row.area_name,
    row.branch_id != null ? String(row.branch_id) : null,
  );
}

export class MySQLTableRepository implements ITableRepository {
  async findAll(): Promise<Table[]> {
    const [rows] = await pool.query<TableRow[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       ORDER BY table_code ASC`,
    );

    return rows.map(mapTableRow);
  }

  async findAllByBranch(branchId: string): Promise<Table[]> {
    const [rows] = await pool.query<TableRow[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE branch_id = ?
       ORDER BY table_code ASC`,
      [String(branchId)],
    );

    return rows.map(mapTableRow);
  }

  async findByCodeInBranch(branchId: string, code: string): Promise<Table | null> {
    const [rows] = await pool.query<TableRow[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE branch_id = ?
         AND LOWER(table_code) = LOWER(?)
       LIMIT 1`,
      [String(branchId), String(code).trim()],
    );

    const row = rows?.[0];
    return row ? mapTableRow(row) : null;
  }

  async findById(tableId: string): Promise<Table | null> {
    const [rows] = await pool.query<TableRow[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE table_id = ?
       LIMIT 1`,
      [tableId],
    );

    const row = rows?.[0];
    return row ? mapTableRow(row) : null;
  }

  async findByDirectionId(directionId: string): Promise<Table | null> {
    const [rows] = await pool.query<TableRow[]>(
      `SELECT table_id, branch_id, table_code, table_status, direction_id, seats, area_name
       FROM restaurant_tables
       WHERE direction_id = ?
       LIMIT 1`,
      [directionId],
    );

    const row = rows?.[0];
    return row ? mapTableRow(row) : null;
  }

  async updateStatus(tableId: string, status: TableStatus): Promise<void> {
    await pool.query(
      `UPDATE restaurant_tables SET table_status = ? WHERE table_id = ?`,
      [status, tableId]
    );
  }

  async create(table: Omit<Table, "id">): Promise<Table> {
    const [result] = await pool.query<any>(
      `INSERT INTO restaurant_tables (branch_id, table_code, table_status, direction_id, seats, area_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        table.branchId ?? null,
        table.code,
        table.status,
        table.directionId,
        table.seats,
        table.areaName ?? null,
      ],
    );

    return new Table(
      String(result.insertId),
      table.code,
      table.status,
      table.directionId,
      table.seats,
      table.areaName,
      table.branchId,
    );
  }

  async update(table: Table): Promise<void> {
    await pool.query(
      `UPDATE restaurant_tables
       SET table_code = ?, table_status = ?, direction_id = ?, seats = ?, area_name = ?
       WHERE table_id = ?`,
      [
        table.code,
        table.status,
        table.directionId,
        table.seats,
        table.areaName ?? null,
        table.id,
      ],
    );
  }

  async delete(tableId: string): Promise<void> {
    await pool.query(`DELETE FROM restaurant_tables WHERE table_id = ?`, [tableId]);
  }
}
