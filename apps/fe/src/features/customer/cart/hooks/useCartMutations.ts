import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { qk } from "@hadilao/contracts";
import {
  getOrCreateCart,
  putCartItems,
  deleteCartItem,
  type AddItemPayload,
} from "../services/cartApi";
import type { CartItem } from "../types";

function cartQueryKey(sessionKey: string) {
  return qk.cart.bySessionKey(sessionKey);
}

export function useAddCartItem(sessionKey: string | null) {
  return useAppMutation({
    mutationFn: async (payload: AddItemPayload) => {
      if (!sessionKey) throw new Error("No session");
      const cart = await getOrCreateCart(sessionKey);
      const newItem: CartItem = {
        itemId: payload.itemId,
        qty: payload.qty ?? 1,
        note: payload.note,
        optionsHash: payload.optionsHash,
      };
      const items = [...(cart.items || []), newItem];
      return putCartItems(cart.cartKey, { items });
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)]] : [],
  });
}

export function useUpdateCartItem(sessionKey: string | null) {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: async ({
      itemId,
      qty,
    }: {
      itemId: string | number;
      qty: number;
    }) => {
      if (!sessionKey) throw new Error("No session");
      const cart = await queryClient.fetchQuery({
        queryKey: cartQueryKey(sessionKey),
        queryFn: () => getOrCreateCart(sessionKey),
      });
      if (!cart?.cartKey) throw new Error("No cart");
      const items = (cart.items || []).map((i) =>
        String(i.itemId) === String(itemId) ? { ...i, qty } : i
      );
      return putCartItems(cart.cartKey, { items });
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)]] : [],
  });
}

export function useRemoveCartItem(sessionKey: string | null) {
  return useAppMutation({
    mutationFn: async ({
      cartKey,
      itemId,
    }: {
      cartKey: string;
      itemId: string | number;
    }) => deleteCartItem(cartKey, itemId),
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)]] : [],
  });
}
