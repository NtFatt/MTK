import type { IClientRefreshTokenRepository, RefreshTokenRecord } from "../../../../application/ports/repositories/IClientRefreshTokenRepository.js";
import { pool } from "../connection.js";

function mapRow(r: any): RefreshTokenRecord {
  return {
    tokenId: String(r.token_id),
    clientId: String(r.client_id),
    jti: String(r.jti),
    tokenHash: String(r.token_hash),
    issuedAt: new Date(r.issued_at),
    expiresAt: new Date(r.expires_at),
    revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
    replacedByJti: r.replaced_by_jti ? String(r.replaced_by_jti) : null,
  };
}

export class MySQLClientRefreshTokenRepository implements IClientRefreshTokenRepository {
  async create(input: { clientId: string; jti: string; tokenHash: string; issuedAt: Date; expiresAt: Date; userAgent: string | null; ipAddress: string | null }): Promise<void> {
    await pool.query(
      `INSERT INTO client_refresh_tokens (client_id, jti, token_hash, issued_at, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      , [input.clientId, input.jti, input.tokenHash, input.issuedAt, input.expiresAt, input.userAgent, input.ipAddress]
    );
  }

  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    const [rows]: any = await pool.query(`SELECT * FROM client_refresh_tokens WHERE jti = ? LIMIT 1`, [jti]);
    const r = rows?.[0];
    return r ? mapRow(r) : null;
  }

  async revokeByJti(jti: string, when: Date, replacedByJti?: string | null): Promise<void> {
    await pool.query(
      `UPDATE client_refresh_tokens
       SET revoked_at = ?, replaced_by_jti = ?
       WHERE jti = ? AND revoked_at IS NULL`,
      [when, replacedByJti ?? null, jti]
    );
  }

  async revokeAllForClient(clientId: string, when: Date): Promise<void> {
    await pool.query(
      `UPDATE client_refresh_tokens SET revoked_at = ? WHERE client_id = ? AND revoked_at IS NULL`,
      [when, clientId]
    );
  }
}
