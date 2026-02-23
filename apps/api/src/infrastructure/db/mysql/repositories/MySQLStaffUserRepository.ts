import type {
  IStaffUserRepository,
  StaffUserRecord,
  StaffUserRole,
  StaffUserStatus,
} from "../../../../application/ports/repositories/IStaffUserRepository.js";
import { pool } from "../connection.js";

export class MySQLStaffUserRepository implements IStaffUserRepository {
  async findByUsername(username: string): Promise<StaffUserRecord | null> {
    const [rows]: any = await pool.query(
      `SELECT staff_id, username, password_hash, full_name, role, status, branch_id
       FROM staff_users
       WHERE username = ?
       LIMIT 1`,
      [username],
    );
    const r = rows?.[0];
    if (!r) return null;
    return {
      staffId: String(r.staff_id),
      username: String(r.username),
      passwordHash: String(r.password_hash),
      fullName: r.full_name ? String(r.full_name) : null,
      role: String(r.role) as any,
      status: String(r.status) as any,
      branchId: r.branch_id ? String(r.branch_id) : null,
    };
  }

  async findById(staffId: string): Promise<StaffUserRecord | null> {
    const [rows]: any = await pool.query(
      `SELECT staff_id, username, password_hash, full_name, role, status, branch_id
       FROM staff_users
       WHERE staff_id = ?
       LIMIT 1`,
      [staffId],
    );
    const r = rows?.[0];
    if (!r) return null;
    return {
      staffId: String(r.staff_id),
      username: String(r.username),
      passwordHash: String(r.password_hash),
      fullName: r.full_name ? String(r.full_name) : null,
      role: String(r.role) as any,
      status: String(r.status) as any,
      branchId: r.branch_id ? String(r.branch_id) : null,
    };
  }

  async list(input?: { branchId?: string | null; status?: StaffUserStatus | null }): Promise<StaffUserRecord[]> {
    const where: string[] = [];
    const params: any[] = [];
    if (input?.branchId !== undefined && input?.branchId !== null) {
      where.push("branch_id = ?");
      params.push(String(input.branchId));
    }
    if (input?.status) {
      where.push("status = ?");
      params.push(String(input.status));
    }
    const sql = `SELECT staff_id, username, password_hash, full_name, role, status, branch_id
       FROM staff_users
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY staff_id DESC`;

    const [rows]: any = await pool.query(sql, params);
    return (rows ?? []).map((r: any) => ({
      staffId: String(r.staff_id),
      username: String(r.username),
      passwordHash: String(r.password_hash),
      fullName: r.full_name ? String(r.full_name) : null,
      role: String(r.role) as any,
      status: String(r.status) as any,
      branchId: r.branch_id ? String(r.branch_id) : null,
    }));
  }

  async create(input: {
    username: string;
    passwordHash: string;
    fullName: string | null;
    role: StaffUserRole;
    branchId: string;
  }): Promise<StaffUserRecord> {
    const [result]: any = await pool.query(
      `INSERT INTO staff_users (username, password_hash, full_name, role, status, branch_id)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [input.username, input.passwordHash, input.fullName, input.role, input.branchId],
    );
    const id = String(result.insertId);
    const created = await this.findById(id);
    if (!created) throw new Error("STAFF_CREATE_FAILED");
    return created;
  }

  async updateRole(staffId: string, role: StaffUserRole): Promise<void> {
    await pool.query(
      `UPDATE staff_users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE staff_id = ?`,
      [role, staffId],
    );
  }

  async updateStatus(staffId: string, status: StaffUserStatus): Promise<void> {
    await pool.query(
      `UPDATE staff_users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE staff_id = ?`,
      [status, staffId],
    );
  }

  async updatePasswordHash(staffId: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE staff_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE staff_id = ?`,
      [passwordHash, staffId],
    );
  }
}
