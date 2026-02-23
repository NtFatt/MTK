import { create } from "zustand";
import type { AuthSession } from "./types";
import * as storage from "./storage";

type AuthState = {
  session: AuthSession | null;
  isHydrated: boolean;
};

type AuthActions = {
  hydrate: () => void;
  setSession: (session: AuthSession) => void;
  logout: () => void;
};

export const authStore = create<AuthState & AuthActions>((set) => ({
  session: null,
  isHydrated: false,

  hydrate() {
    const session = storage.loadSession();
    set({ session, isHydrated: true });
  },

  setSession(session) {
    storage.saveSession(session);
    set({ session });
  },

  logout() {
    storage.clearSession();
    set({ session: null });
  },
}));

export const selectIsAuthed = (s: AuthState) => s.session != null;
export const selectRole = (s: AuthState) => s.session?.role ?? null;
export const selectPermissions = (s: AuthState) => s.session?.permissions ?? [];
export const selectBranchId = (s: AuthState) => s.session?.branchId ?? null;
