export interface IPaymentGateway {
  createPaymentUrl(input: {
    txnRef: string;
    amount: number;
    orderInfo: string;
    returnUrl: string;
    ipnUrl: string;
  }): string;

  verifySignature(params: Record<string, string>): boolean;
}
