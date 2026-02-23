import type { IAdminUserRepository, AdminUserRecord } from "../../../../application/ports/repositories/IAdminUserRepository.js";
import { pool } from "../connection.js";

export class MySQLAdminUserRepository implements IAdminUserRepository {
  async findByUsername(username: string): Promise<AdminUserRecord | null> {
    const [rows]: any = await pool.query(
      `SELECT admin_id, username, password_hash, full_name, role, status
       FROM admin_users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );
    const r = rows?.[0];
    if (!r) return null;

    return {
      adminId: String(r.admin_id),
      username: String(r.username),
      passwordHash: String(r.password_hash),
      fullName: r.full_name ? String(r.full_name) : null,
      role: String(r.role),
      status: String(r.status),
    };
  }
}
