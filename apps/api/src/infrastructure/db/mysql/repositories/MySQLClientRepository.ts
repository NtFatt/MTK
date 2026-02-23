import type { IClientRepository, ClientRecord } from "../../../../application/ports/repositories/IClientRepository.js";
import { pool } from "../connection.js";

function mapRow(r: any): ClientRecord {
  return {
    clientId: String(r.client_id),
    phone: String(r.phone),
    fullName: r.full_name ?? null,
    email: r.email ?? null,
    status: (String(r.status) as any) === "BLOCKED" ? "BLOCKED" : "ACTIVE",
    rankId: String(r.rank_id),
  };
}

export class MySQLClientRepository implements IClientRepository {
  async findByPhone(phone: string): Promise<ClientRecord | null> {
    const [rows]: any = await pool.query(`SELECT * FROM clients WHERE phone = ? LIMIT 1`, [phone]);
    const r = rows?.[0];
    return r ? mapRow(r) : null;
  }

  async findById(clientId: string): Promise<ClientRecord | null> {
    const [rows]: any = await pool.query(`SELECT * FROM clients WHERE client_id = ? LIMIT 1`, [clientId]);
    const r = rows?.[0];
    return r ? mapRow(r) : null;
  }

  async createByPhone(phone: string): Promise<ClientRecord> {
    // Default rank = BRONZE
    const [rankRows]: any = await pool.query(`SELECT rank_id FROM member_ranks WHERE rank_code='BRONZE' LIMIT 1`);
    const rankId = rankRows?.[0]?.rank_id;
    if (!rankId) throw new Error("INTERNAL_SERVER_ERROR");

    const [result]: any = await pool.query(
      `INSERT INTO clients(phone, status, total_spend, rank_id) VALUES (?, 'ACTIVE', 0, ?)`,
      [phone, rankId]
    );

    const createdId = result.insertId;
    const created = await this.findById(String(createdId));
    if (!created) throw new Error("INTERNAL_SERVER_ERROR");
    return created;
  }
}
