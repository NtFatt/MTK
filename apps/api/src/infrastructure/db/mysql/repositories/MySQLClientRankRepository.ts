import type { IClientRankRepository } from "../../../../application/ports/repositories/IClientRankRepository.js";
import { pool } from "../connection.js";

export class MySQLClientRankRepository implements IClientRankRepository {
  async getDiscountPercentByClientId(clientId: string): Promise<number> {
    const [rows]: any = await pool.query(
      `SELECT r.discount_percent
       FROM clients c
       JOIN member_ranks r ON r.rank_id = c.rank_id
       WHERE c.client_id = ? LIMIT 1`,
      [clientId]
    );
    const r = rows?.[0];
    return r ? Number(r.discount_percent) : 0;
  }
}
