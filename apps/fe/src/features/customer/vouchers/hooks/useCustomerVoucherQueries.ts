import { qk } from "@hadilao/contracts";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { recoverInvalidCustomerSession } from "../../../../shared/customer/session/sessionRecovery";
import { listAvailableVouchers, applyCartVoucher, removeCartVoucher } from "../services/voucherApi";

function availableVoucherKey(cartKey: string) {
  return ["vouchers", "available", { cartKey }] as const;
}

export function useAvailableVouchersQuery(cartKey: string | null) {
  return useAppQuery({
    queryKey: availableVoucherKey(cartKey ?? "__missing__"),
    enabled: !!cartKey,
    queryFn: () => listAvailableVouchers(cartKey!),
    staleTime: 15 * 1000,
  });
}

export function useApplyCartVoucherMutation(input: {
  cartKey: string;
  sessionKey: string;
}) {
  return useAppMutation({
    mutationFn: async (code: string) => applyCartVoucher(input.cartKey, code),
    onError: (error) => recoverInvalidCustomerSession(error),
    invalidateKeys: [
      [...qk.cart.bySessionKey(input.sessionKey)],
      [...qk.cart.byCartKey(input.cartKey)],
      [...availableVoucherKey(input.cartKey)],
      ["menu", "view"],
    ],
  });
}

export function useRemoveCartVoucherMutation(input: {
  cartKey: string;
  sessionKey: string;
}) {
  return useAppMutation({
    mutationFn: async () => removeCartVoucher(input.cartKey),
    onError: (error) => recoverInvalidCustomerSession(error),
    invalidateKeys: [
      [...qk.cart.bySessionKey(input.sessionKey)],
      [...qk.cart.byCartKey(input.cartKey)],
      [...availableVoucherKey(input.cartKey)],
      ["menu", "view"],
    ],
  });
}
