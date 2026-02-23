import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { qk } from "@hadilao/contracts";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "../../../../shared/http/idempotency";
import { createOrder, type CreateOrderParams } from "../services/orderApi";
import type { Order } from "../types";
import type { HttpError } from "../../../../shared/http/errors";

const IDEM_SCOPE_PREFIX = "order.create.";

export type CreateOrderVariables = {
  cartKey: string;
  sessionKey: string;
  note?: string;
};

export function useCreateOrderMutation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useAppMutation<Order, HttpError, CreateOrderVariables>({
    mutationFn: async (variables) => {
      const idempotencyKey = getOrCreateIdempotencyKey(
        `${IDEM_SCOPE_PREFIX}${variables.sessionKey}`
      );
      const params: CreateOrderParams = {
        cartKey: variables.cartKey,
        idempotencyKey,
        note: variables.note,
      };
      return createOrder(params);
    },
    onSuccess: (data, variables) => {
      clearIdempotencyKey(`${IDEM_SCOPE_PREFIX}${variables.sessionKey}`);
      queryClient.invalidateQueries({ queryKey: qk.cart.bySessionKey(variables.sessionKey) });
      queryClient.invalidateQueries({ queryKey: qk.cart.byCartKey(variables.cartKey) });
      if (data?.orderCode) {
        navigate(`/c/orders/${encodeURIComponent(data.orderCode)}`, { replace: true });
      }
    },
  });
}
