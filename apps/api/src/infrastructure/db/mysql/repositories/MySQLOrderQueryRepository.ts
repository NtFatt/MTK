import type { IOrderQueryRepository, OrderListRow } from "../../../../application/ports/repositories/IOrderQueryRepository.js";
import type { OrderStatus } from "../../../../domain/entities/Order.js";
import { pool } from "../connection.js";

function toIso(v: any): string {
  try {
    return new Date(v).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function normalizeStatuses(statuses: OrderStatus[]): OrderStatus[] {
  const set = new Set<OrderStatus>();
  for (const s of statuses ?? []) {
    const v = String(s ?? "").toUpperCase() as OrderStatus;
    // Only allow defined enum values
    if (
      v === "NEW" || v === "RECEIVED" || v === "PREPARING" || v === "READY" || v === "SERVING" ||
      v === "DELIVERING" || v === "COMPLETED" || v === "CANCELED" || v === "PAID"
    ) {
      set.add(v);
    }
  }
  return [...set];
}

export class MySQLOrderQueryRepository implements IOrderQueryRepository {
  async listKitchenQueue(input: {
    branchId?: string | null;
    statuses: OrderStatus[];
    limit: number;
  }): Promise<OrderListRow[]> {
    const statuses = normalizeStatuses(input.statuses);
    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 50))));

    // Default queue statuses if none provided
    const effectiveStatuses = statuses.length ? statuses : (["NEW", "RECEIVED", "PREPARING", "READY"] as OrderStatus[]);

    const where: string[] = [];
    const params: any[] = [];

    if (input.branchId) {
      where.push("rt.branch_id = ?");
      params.push(String(input.branchId));
    }

    where.push(`o.order_status IN (${effectiveStatuses.map(() => "?").join(",")})`);
    params.push(...effectiveStatuses);

    params.push(limit);

    const sql = `
      SELECT o.order_code, o.order_status, o.created_at, o.updated_at, rt.branch_id, rt.table_code
      FROM orders o
      LEFT JOIN table_sessions s ON s.session_id = o.session_id
      LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY o.created_at DESC
      LIMIT ?
    `;

    const [rows]: any = await pool.query(sql, params);
    return (rows ?? []).map((r: any) => ({
      orderCode: String(r.order_code),
      orderStatus: String(r.order_status) as OrderStatus,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
      tableCode: r.table_code ? String(r.table_code) : null,
    }));
  }

  async listUnpaidOrders(input: {
    branchId?: string | null;
    limit: number;
  }): Promise<OrderListRow[]> {
    const limit = Math.max(1, Math.min(200, Math.floor(Number(input.limit ?? 50))));

    const where: string[] = ["o.order_status NOT IN ('PAID','CANCELED')"]; // unpaid
    const params: any[] = [];

    if (input.branchId) {
      where.push("rt.branch_id = ?");
      params.push(String(input.branchId));
    }

    params.push(limit);

    const sql = `
      SELECT o.order_code, o.order_status, o.created_at, o.updated_at, rt.branch_id, rt.table_code
      FROM orders o
      LEFT JOIN table_sessions s ON s.session_id = o.session_id
      LEFT JOIN restaurant_tables rt ON rt.table_id = s.table_id
      WHERE ${where.join(" AND ")}
      ORDER BY o.created_at DESC
      LIMIT ?
    `;

    const [rows]: any = await pool.query(sql, params);
    return (rows ?? []).map((r: any) => ({
      orderCode: String(r.order_code),
      orderStatus: String(r.order_status) as OrderStatus,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
      branchId: r.branch_id !== null && r.branch_id !== undefined ? String(r.branch_id) : null,
      tableCode: r.table_code ? String(r.table_code) : null,
    }));
  }
}
