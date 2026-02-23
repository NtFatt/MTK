export type VNPayLogType = "RETURN" | "IPN";

export interface IVNPayLogRepository {
  upsertLog(input: {
    paymentId: string;
    logType: VNPayLogType;
    vnpTxnRef: string;
    vnpResponseCode: string | null;
    vnpTransactionNo: string | null;
    vnpSecureHash: string | null;
    rawQuery: string | null;
  }): Promise<void>;
}
