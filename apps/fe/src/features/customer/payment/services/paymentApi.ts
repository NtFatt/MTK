// apps/fe/src/features/customer/payment/services/paymentApi.ts
import { apiFetch } from "../../../../lib/apiFetch";

export type CreatePaymentResponse = {
  paymentUrl?: string;
  url?: string;
};

export async function createVnpayPayment(
  orderCode: string,
  idempotencyKey?: string,
): Promise<CreatePaymentResponse> {
  return apiFetch<CreatePaymentResponse>(
    `/payments/vnpay/create/${encodeURIComponent(orderCode)}`,
    {
      method: "POST",
      cache: "no-store",
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  );
}

export async function confirmVnpayReturn(search: string): Promise<string> {
  const qs = search.startsWith("?") ? search : `?${search}`;
  return apiFetch<string>(`/payments/vnpay/return${qs}`, {
    method: "GET",
    cache: "no-store",
  });
}