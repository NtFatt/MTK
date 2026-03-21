import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { qk } from "@hadilao/contracts";
import { useCustomerSessionStore, selectBranchId } from "../../../../shared/customer/session/sessionStore";
import { recoverInvalidCustomerSession } from "../../../../shared/customer/session/sessionRecovery";
import { sameItemCustomization } from "../../shared/itemCustomization";

import {
  getOrCreateCart,
  upsertCartItem,
  deleteCartItem,
  type AddItemPayload,
} from "../services/cartApi";

function cartQueryKey(sessionKey: string) {
  return qk.cart.bySessionKey(sessionKey);
}

const MENU_VIEW_QUERY_PREFIX = ["menu", "view"] as const;

export function useAddCartItem(sessionKey: string | null) {
  const branchId = useCustomerSessionStore(selectBranchId);
  return useAppMutation({
    mutationFn: async (payload: AddItemPayload) => {
      if (!sessionKey) throw new Error("No session");
      if (!branchId) throw new Error("No branch");

      const cart = await getOrCreateCart(sessionKey, branchId);

      const current = (cart.items || []).find(
        (i) =>
          String(i.itemId) === String(payload.itemId) &&
          sameItemCustomization(i.itemOptions ?? null, payload.itemOptions ?? null)
      );

      const addQty = payload.qty ?? 1;
      const nextQty = (current?.qty ?? 0) + addQty;

      await upsertCartItem(cart.cartKey, {
        itemId: payload.itemId,
        quantity: nextQty,
        itemOptions: payload.itemOptions,
      });

      return true;
    },
    onError: (error) => {
      recoverInvalidCustomerSession(error);
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)], [...MENU_VIEW_QUERY_PREFIX]] : [],
  });
}

export function useUpdateCartItem(sessionKey: string | null) {
  const queryClient = useQueryClient();
  const branchId = useCustomerSessionStore(selectBranchId);
  return useAppMutation({
    mutationFn: async ({
      itemId,
      qty,
      itemOptions,
    }: {
      itemId: string | number;
      qty: number;
      itemOptions?: unknown;
    }) => {
      if (!sessionKey) throw new Error("No session");
      if (!branchId) throw new Error("No branch");

      const cart = await queryClient.fetchQuery({
        queryKey: cartQueryKey(sessionKey),
        queryFn: () => getOrCreateCart(sessionKey, branchId),
      });

      if (!cart?.cartKey) throw new Error("No cart");

      await upsertCartItem(cart.cartKey, { itemId, quantity: qty, itemOptions });
      return true;
    },
    onError: (error) => {
      recoverInvalidCustomerSession(error);
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)], [...MENU_VIEW_QUERY_PREFIX]] : [],
  });
}

export function useRemoveCartItem(sessionKey: string | null) {
  return useAppMutation({
    mutationFn: async ({
      cartKey,
      itemId,
      optionsHash,
    }: {
      cartKey: string;
      itemId: string | number;
      optionsHash?: string;
    }) => deleteCartItem(cartKey, itemId, optionsHash),
    onError: (error) => {
      recoverInvalidCustomerSession(error);
    },
    invalidateKeys: sessionKey ? [[...cartQueryKey(sessionKey)], [...MENU_VIEW_QUERY_PREFIX]] : [],
  });
}
