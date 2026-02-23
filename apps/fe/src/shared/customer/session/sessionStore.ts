import { create } from "zustand";
import { useStore } from "zustand";
import type { CustomerSession } from "./types";
import * as storage from "./storage";

export type CustomerSessionState = {
  session: CustomerSession | null;
  isHydrated: boolean;
};

export type CustomerSessionActions = {
  hydrate: () => void;
  setSession: (session: CustomerSession) => void;
  clear: () => void;
};

// Gom chung type lại để truyền vào generic cho dễ quản lý
type StoreState = CustomerSessionState & CustomerSessionActions;

export const customerSessionStore = create<StoreState>((set) => ({
  session: null,
  isHydrated: false,

  hydrate() {
    const session = storage.loadCustomerSession();
    set({ session, isHydrated: true });
  },

  setSession(session) {
    storage.saveCustomerSession(session);
    set({ session });
  },

  clear() {
    storage.clearCustomerSession();
    set({ session: null });
  },
}));


export function useCustomerSessionStore<T>(selector: (state: StoreState) => T): T {
  return useStore(customerSessionStore, selector);
}


export const selectSessionKey = (s: CustomerSessionState) => s.session?.sessionKey ?? null;
export const selectBranchId = (s: CustomerSessionState) => s.session?.branchId ?? null;
export const selectTableCode = (s: CustomerSessionState) => s.session?.tableCode ?? null;
export const selectHasSession = (s: CustomerSessionState) => s.session != null;