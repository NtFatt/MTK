import type { IVNPayLogRepository } from "../../../../application/ports/repositories/IVNPayLogRepository.js";
import { pool } from "../connection.js";

export class MySQLVNPayLogRepository implements IVNPayLogRepository {
  async upsertLog(input: {
    paymentId: string;
    logType: "RETURN" | "IPN";
    vnpTxnRef: string;
    vnpResponseCode: string | null;
    vnpTransactionNo: string | null;
    vnpSecureHash: string | null;
    rawQuery: string | null;
  }): Promise<void> {
    // Unique: (vnp_TxnRef, log_type)
    await pool.query(
      `INSERT INTO vnpay_logs
        (payment_id, log_type, vnp_TxnRef, vnp_ResponseCode, vnp_TransactionNo, vnp_SecureHash, raw_query)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        vnp_ResponseCode = VALUES(vnp_ResponseCode),
        vnp_TransactionNo = VALUES(vnp_TransactionNo),
        vnp_SecureHash = VALUES(vnp_SecureHash),
        raw_query = VALUES(raw_query),
        received_at = CURRENT_TIMESTAMP`,
      [
        input.paymentId,
        input.logType,
        input.vnpTxnRef,
        input.vnpResponseCode,
        input.vnpTransactionNo,
        input.vnpSecureHash,
        input.rawQuery,
      ]
    );
  }
}
