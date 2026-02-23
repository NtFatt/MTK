import type { IOtpRepository, OtpPurpose, OtpRequestRecord } from "../../../../application/ports/repositories/IOtpRepository.js";
import { pool } from "../connection.js";

function mapRow(r: any): OtpRequestRecord {
  return {
    otpId: String(r.otp_id),
    phone: String(r.phone),
    otpHash: String(r.otp_hash),
    purpose: (String(r.purpose) as OtpPurpose),
    attempts: Number(r.attempts),
    maxAttempts: Number(r.max_attempts),
    expiresAt: new Date(r.expires_at),
    verifiedAt: r.verified_at ? new Date(r.verified_at) : null,
    createdAt: new Date(r.created_at),
  };
}

export class MySQLOtpRepository implements IOtpRepository {
  async createRequest(input: { phone: string; otpHash: string; purpose: OtpPurpose; expiresAt: Date; maxAttempts: number }): Promise<{ otpId: string; expiresAt: Date }> {
    const [result]: any = await pool.query(
      `INSERT INTO otp_requests (phone, otp_hash, purpose, attempts, max_attempts, expires_at)
       VALUES (?, ?, ?, 0, ?, ?)`
      , [input.phone, input.otpHash, input.purpose, input.maxAttempts, input.expiresAt]
    );
    return { otpId: String(result.insertId), expiresAt: input.expiresAt };
  }

  async expireOtherPending(phone: string, purpose: OtpPurpose): Promise<void> {
    await pool.query(
      `UPDATE otp_requests
       SET expires_at = NOW()
       WHERE phone = ? AND purpose = ? AND verified_at IS NULL AND expires_at > NOW()`
      , [phone, purpose]
    );
  }

  async findLatestActive(phone: string, purpose: OtpPurpose): Promise<OtpRequestRecord | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM otp_requests
       WHERE phone = ? AND purpose = ?
         AND verified_at IS NULL
         AND expires_at > NOW()
       ORDER BY otp_id DESC
       LIMIT 1`,
      [phone, purpose]
    );
    const r = rows?.[0];
    return r ? mapRow(r) : null;
  }

  async incrementAttempts(otpId: string): Promise<void> {
    await pool.query(
      `UPDATE otp_requests SET attempts = attempts + 1 WHERE otp_id = ?`,
      [otpId]
    );
  }

  async markVerified(otpId: string, when: Date): Promise<void> {
    await pool.query(
      `UPDATE otp_requests SET verified_at = ? WHERE otp_id = ?`,
      [when, otpId]
    );
  }
}
