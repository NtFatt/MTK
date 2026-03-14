// apps/fe/src/features/customer/payment/hooks/useCreatePaymentMutation.ts
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import {
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
} from "../../../../shared/http/idempotency";
import { createVnpayPayment } from "../services/paymentApi";
import { setLastPaymentOrderCode } from "../storage";
import type { HttpError } from "../../../../shared/http/errors";

const IDEM_SCOPE_PREFIX = "payment.init.";

export function useCreatePaymentMutation() {
  return useAppMutation<
    { paymentUrl?: string; url?: string },
    HttpError,
    { orderCode: string }
  >({
    mutationFn: async ({ orderCode }) => {
      const scope = `${IDEM_SCOPE_PREFIX}${orderCode}`;
      const idempotencyKey = getOrCreateIdempotencyKey(scope);
      return createVnpayPayment(orderCode, idempotencyKey);
    },
    onSuccess: (data, variables) => {
      const url = data.paymentUrl ?? data.url;
      if (!url) throw new Error("Missing paymentUrl");
      setLastPaymentOrderCode(variables.orderCode);
      clearIdempotencyKey(`${IDEM_SCOPE_PREFIX}${variables.orderCode}`);
      window.location.assign(url);
    },
  });
}