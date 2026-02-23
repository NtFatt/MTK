export interface IPaymentRepository {
  createInitPayment(
    orderCode: string,
    opts?: {
      provider?: string;
      /** Prefix used to generate txn_ref (e.g., VNP, CASH, MOCK). */
      txnPrefix?: string;
    },
  ): Promise<{
    paymentId: string;
    txnRef: string;
    amount: number;
  }>;

  markRedirected(paymentId: string): Promise<void>;
  markSuccess(txnRef: string): Promise<void>;
  markFailed(txnRef: string): Promise<void>;

  findOrderCodeByTxnRef(txnRef: string): Promise<string | null>;

  findPaymentIdByTxnRef(txnRef: string): Promise<string | null>;
}
