import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { qk } from "@hadilao/contracts";
import { useStore } from "zustand";
import { customerSessionStore } from "../../../../shared/customer/session/sessionStore";
import { useCustomerSessionStore, selectBranchId } from "../../../../shared/customer/session/sessionStore";

import {
  getOrCreateCart,
  upsertCartItem,
  deleteCartItem,
  type AddItemPayload,
} from "../services/cartApi";

function cartQueryKey(sessionKey: string) {
  return qk.cart.bySessionKey(sessionKey);
}

export function useAddCartItem(sessionKey: string | null) {

const branchId = useCustomerSessionStore(selectBranchId);
  return useAppMutation({
    mutationFn: async (payload: AddItemPayload) => {
      if (!sessionKey) throw new Error("No session");
      if (!branchId) throw new Error("No branch");

      const cart = await getOrCreateCart(sessionKey, branchId);

      const current = (cart.items || []).find(
        (i) => String(i.itemId) === String(payload.itemId)
      );

      const addQty = payload.qty ?? 1;
      const nextQty = (current?.qty ?? 0) + addQty;

      await upsertCartItem(cart.cartKey, {
        itemId: payload.itemId,
        quantity: nextQty,
      });

      return true;
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)]] : [],
  });
}

export function useUpdateCartItem(sessionKey: string | null) {
  const queryClient = useQueryClient();
  const branchId = useStore(customerSessionStore, (s: any) => s.branchId);

  return useAppMutation({
    mutationFn: async ({ itemId, qty }: { itemId: string | number; qty: number }) => {
      if (!sessionKey) throw new Error("No session");
      if (!branchId) throw new Error("No branch");

      const cart = await queryClient.fetchQuery({
        queryKey: cartQueryKey(sessionKey),
        queryFn: () => getOrCreateCart(sessionKey, branchId),
      });

      if (!cart?.cartKey) throw new Error("No cart");

      await upsertCartItem(cart.cartKey, { itemId, quantity: qty });
      return true;
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)]] : [],
  });
}

export function useRemoveCartItem(sessionKey: string | null) {
  return useAppMutation({
    mutationFn: async ({ cartKey, itemId }: { cartKey: string; itemId: string | number }) =>
      deleteCartItem(cartKey, itemId),
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)]] : [],
  });
}