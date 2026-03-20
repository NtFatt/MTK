import type { IVoucherRepository, VoucherRecord, VoucherUsageSnapshot } from "../../../../application/ports/repositories/IVoucherRepository.js";
import { pool } from "../connection.js";

function pickExecutor(conn?: any) {
  return conn ?? pool;
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value as any).toISOString();
}

function toMySqlDateTime(value: unknown): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("INVALID_VOUCHER_DATETIME");
    return value;
  }

  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) throw new Error("INVALID_VOUCHER_DATETIME");
  return parsed;
}

function assertVoucherWindow(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("VOUCHER_TIME_RANGE_INVALID");
  }
}

function toNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCode(code: string): string {
  return String(code ?? "").trim().toUpperCase();
}

export class MySQLVoucherRepository implements IVoucherRepository {
  private mapRow(row: any): VoucherRecord {
    return {
      id: String(row.voucher_id),
      branchId: String(row.branch_id),
      code: String(row.voucher_code),
      name: String(row.voucher_name),
      description: row.description ? String(row.description) : null,
      discountType: String(row.discount_type) as VoucherRecord["discountType"],
      discountValue: toNum(row.discount_value),
      maxDiscountAmount: toNullableNum(row.max_discount_amount),
      minSubtotal: toNum(row.min_subtotal),
      usageLimitTotal: toNullableNum(row.usage_limit_total),
      usageLimitPerSession: toNullableNum(row.usage_limit_per_session),
      usageCount: Math.max(0, Math.trunc(toNum(row.usage_count))),
      startsAt: toIso(row.starts_at),
      endsAt: toIso(row.ends_at),
      isActive: Boolean(row.is_active),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  }

  async listByBranch(input: {
    branchId: string;
    q?: string | null;
    includeInactive?: boolean;
  }): Promise<VoucherRecord[]> {
    const sql: string[] = [
      `SELECT * FROM vouchers WHERE branch_id = ?`,
    ];
    const params: any[] = [String(input.branchId)];

    if (!input.includeInactive) {
      sql.push(`AND is_active = 1`);
    }

    if (input.q && input.q.trim()) {
      sql.push(`AND (voucher_code LIKE ? OR voucher_name LIKE ?)`); 
      const like = `%${input.q.trim()}%`;
      params.push(like, like);
    }

    sql.push(`ORDER BY is_active DESC, ends_at ASC, voucher_name ASC, voucher_id DESC`);

    const [rows]: any = await pool.query(sql.join(" "), params);
    return (rows ?? []).map((row: any) => this.mapRow(row));
  }

  async listPublicByBranch(branchId: string): Promise<VoucherRecord[]> {
    const [rows]: any = await pool.query(
      `SELECT *
       FROM vouchers
       WHERE branch_id = ?
         AND is_active = 1
       ORDER BY starts_at ASC, ends_at ASC, voucher_name ASC`,
      [String(branchId)],
    );

    return (rows ?? []).map((row: any) => this.mapRow(row));
  }

  async findById(
    voucherId: string,
    options?: { conn?: any; forUpdate?: boolean },
  ): Promise<VoucherRecord | null> {
    const exec = pickExecutor(options?.conn);
    const forUpdate = options?.forUpdate ? " FOR UPDATE" : "";
    const [rows]: any = await exec.query(
      `SELECT * FROM vouchers WHERE voucher_id = ? LIMIT 1${forUpdate}`,
      [String(voucherId)],
    );
    const row = rows?.[0];
    return row ? this.mapRow(row) : null;
  }

  async findByCodeForBranch(
    branchId: string,
    code: string,
    options?: { conn?: any; forUpdate?: boolean },
  ): Promise<VoucherRecord | null> {
    const exec = pickExecutor(options?.conn);
    const forUpdate = options?.forUpdate ? " FOR UPDATE" : "";
    const [rows]: any = await exec.query(
      `SELECT *
       FROM vouchers
       WHERE branch_id = ? AND voucher_code = ?
       LIMIT 1${forUpdate}`,
      [String(branchId), normalizeCode(code)],
    );
    const row = rows?.[0];
    return row ? this.mapRow(row) : null;
  }

  async create(input: {
    branchId: string;
    code: string;
    name: string;
    description: string | null;
    discountType: "PERCENT" | "FIXED_AMOUNT";
    discountValue: number;
    maxDiscountAmount: number | null;
    minSubtotal: number;
    usageLimitTotal: number | null;
    usageLimitPerSession: number | null;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
  }): Promise<VoucherRecord> {
    const startsAt = toMySqlDateTime(input.startsAt);
    const endsAt = toMySqlDateTime(input.endsAt);
    assertVoucherWindow(startsAt, endsAt);

    try {
      const [result]: any = await pool.query(
        `INSERT INTO vouchers
         (branch_id, voucher_code, voucher_name, description, discount_type, discount_value,
          max_discount_amount, min_subtotal, usage_limit_total, usage_limit_per_session,
          starts_at, ends_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(input.branchId),
          normalizeCode(input.code),
          input.name,
          input.description ?? null,
          input.discountType,
          input.discountValue,
          input.maxDiscountAmount ?? null,
          input.minSubtotal,
          input.usageLimitTotal ?? null,
          input.usageLimitPerSession ?? null,
          startsAt,
          endsAt,
          input.isActive ? 1 : 0,
        ],
      );
      return (await this.findById(String(result.insertId)))!;
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY") {
        throw new Error("VOUCHER_CODE_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  async update(input: {
    voucherId: string;
    branchId: string;
    code?: string;
    name?: string;
    description?: string | null;
    discountType?: "PERCENT" | "FIXED_AMOUNT";
    discountValue?: number;
    maxDiscountAmount?: number | null;
    minSubtotal?: number;
    usageLimitTotal?: number | null;
    usageLimitPerSession?: number | null;
    startsAt?: string;
    endsAt?: string;
    isActive?: boolean;
  }): Promise<VoucherRecord> {
    const existing = await this.findById(input.voucherId);
    if (!existing || existing.branchId !== String(input.branchId)) throw new Error("VOUCHER_NOT_FOUND");

    const effectiveStartsAt = input.startsAt !== undefined
      ? toMySqlDateTime(input.startsAt)
      : toMySqlDateTime(existing.startsAt);
    const effectiveEndsAt = input.endsAt !== undefined
      ? toMySqlDateTime(input.endsAt)
      : toMySqlDateTime(existing.endsAt);

    assertVoucherWindow(effectiveStartsAt, effectiveEndsAt);

    const fields: string[] = [];
    const params: any[] = [];

    if (input.code !== undefined) {
      fields.push(`voucher_code = ?`);
      params.push(normalizeCode(input.code));
    }
    if (input.name !== undefined) {
      fields.push(`voucher_name = ?`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = ?`);
      params.push(input.description ?? null);
    }
    if (input.discountType !== undefined) {
      fields.push(`discount_type = ?`);
      params.push(input.discountType);
    }
    if (input.discountValue !== undefined) {
      fields.push(`discount_value = ?`);
      params.push(input.discountValue);
    }
    if (input.maxDiscountAmount !== undefined) {
      fields.push(`max_discount_amount = ?`);
      params.push(input.maxDiscountAmount ?? null);
    }
    if (input.minSubtotal !== undefined) {
      fields.push(`min_subtotal = ?`);
      params.push(input.minSubtotal);
    }
    if (input.usageLimitTotal !== undefined) {
      fields.push(`usage_limit_total = ?`);
      params.push(input.usageLimitTotal ?? null);
    }
    if (input.usageLimitPerSession !== undefined) {
      fields.push(`usage_limit_per_session = ?`);
      params.push(input.usageLimitPerSession ?? null);
    }
    if (input.startsAt !== undefined) {
      fields.push(`starts_at = ?`);
      params.push(effectiveStartsAt);
    }
    if (input.endsAt !== undefined) {
      fields.push(`ends_at = ?`);
      params.push(effectiveEndsAt);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = ?`);
      params.push(input.isActive ? 1 : 0);
    }

    if (!fields.length) {
      return existing;
    }

    try {
      await pool.query(
        `UPDATE vouchers
         SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE voucher_id = ? AND branch_id = ?`,
        [...params, String(input.voucherId), String(input.branchId)],
      );
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY") {
        throw new Error("VOUCHER_CODE_ALREADY_EXISTS");
      }
      throw error;
    }

    const updated = await this.findById(input.voucherId);
    if (!updated || updated.branchId !== String(input.branchId)) throw new Error("VOUCHER_NOT_FOUND");
    return updated;
  }

  async setActive(input: {
    voucherId: string;
    branchId: string;
    isActive: boolean;
  }): Promise<VoucherRecord> {
    await pool.query(
      `UPDATE vouchers
       SET is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE voucher_id = ? AND branch_id = ?`,
      [input.isActive ? 1 : 0, String(input.voucherId), String(input.branchId)],
    );

    const updated = await this.findById(input.voucherId);
    if (!updated || updated.branchId !== String(input.branchId)) throw new Error("VOUCHER_NOT_FOUND");
    return updated;
  }

  async setCartVoucher(cartId: string, voucherId: string | null): Promise<void> {
    await pool.query(
      `UPDATE carts
       SET applied_voucher_id = ?
       WHERE cart_id = ?`,
      [voucherId ? String(voucherId) : null, String(cartId)],
    );
  }

  async getCartVoucher(cartId: string, options?: { conn?: any }): Promise<VoucherRecord | null> {
    const exec = pickExecutor(options?.conn);
    const [rows]: any = await exec.query(
      `SELECT v.*
       FROM carts c
       LEFT JOIN vouchers v ON v.voucher_id = c.applied_voucher_id
       WHERE c.cart_id = ?
       LIMIT 1`,
      [String(cartId)],
    );
    const row = rows?.[0];
    return row?.voucher_id ? this.mapRow(row) : null;
  }

  async countUsagesForSession(
    voucherId: string,
    sessionId: string,
    options?: { conn?: any },
  ): Promise<number> {
    const exec = pickExecutor(options?.conn);
    const [rows]: any = await exec.query(
      `SELECT COUNT(*) AS usage_count
       FROM voucher_usages
       WHERE voucher_id = ? AND session_id = ?`,
      [String(voucherId), String(sessionId)],
    );
    return Math.max(0, Math.trunc(toNum(rows?.[0]?.usage_count)));
  }

  async recordUsage(input: VoucherUsageSnapshot, options?: { conn?: any }): Promise<void> {
    const exec = pickExecutor(options?.conn);
    await exec.query(
      `INSERT INTO voucher_usages
       (voucher_id, branch_id, order_id, session_id, voucher_code_snapshot, voucher_name_snapshot,
        discount_type, discount_value, discount_amount, subtotal_amount, total_after_discount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.voucherId,
        input.branchId,
        input.orderId,
        input.sessionId ?? null,
        input.voucherCodeSnapshot,
        input.voucherNameSnapshot,
        input.discountType,
        input.discountValue,
        input.discountAmount,
        input.subtotalAmount,
        input.totalAfterDiscount,
      ],
    );

    await exec.query(
      `UPDATE vouchers
       SET usage_count = usage_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE voucher_id = ?`,
      [input.voucherId],
    );
  }

  async reverseUsageForOrder(
    orderId: string,
    options?: { conn?: any },
  ): Promise<{
    reversed: boolean;
    voucherId: string | null;
  }> {
    const exec = pickExecutor(options?.conn);
    const [rows]: any = await exec.query(
      `SELECT usage_id, voucher_id
       FROM voucher_usages
       WHERE order_id = ?
       LIMIT 1`,
      [String(orderId)],
    );
    const usage = rows?.[0];
    if (!usage) {
      return { reversed: false, voucherId: null };
    }

    const voucherId = String(usage.voucher_id);
    await exec.query(`DELETE FROM voucher_usages WHERE usage_id = ?`, [String(usage.usage_id)]);
    await exec.query(
      `UPDATE vouchers
       SET usage_count = CASE WHEN usage_count > 0 THEN usage_count - 1 ELSE 0 END,
           updated_at = CURRENT_TIMESTAMP
       WHERE voucher_id = ?`,
      [voucherId],
    );

    return { reversed: true, voucherId };
  }
}
