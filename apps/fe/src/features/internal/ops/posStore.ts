import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type PosTableContext = {
  branchId?: string | number;
  tableId?: string;
  tableCode?: string;
  directionId?: string;

  sessionKey?: string;
  cartKey?: string;

  setTable: (x: {
    branchId?: string | number;
    tableId: string;
    tableCode?: string;
    directionId?: string;
  }) => void;

  setSession: (x: { sessionKey?: string; cartKey?: string }) => void;

  clear: () => void;

  // NEW: để page biết store đã hydrate xong hay chưa
  _hasHydrated: boolean;
};

export const posStore = create<PosTableContext>()(
  persist(
    (set) => ({
      branchId: undefined,
      tableId: undefined,
      tableCode: undefined,
      directionId: undefined,
      sessionKey: undefined,
      cartKey: undefined,

      setTable: (x) =>
        set({
          branchId: x.branchId,
          tableId: x.tableId,
          tableCode: x.tableCode,
          directionId: x.directionId,
        }),

      setSession: (x) => set({ sessionKey: x.sessionKey, cartKey: x.cartKey }),

      clear: () =>
        set({
          tableId: undefined,
          tableCode: undefined,
          directionId: undefined,
          sessionKey: undefined,
          cartKey: undefined,
        }),

      _hasHydrated: false,
    }),
    {
      name: "hadilao.pos",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        branchId: s.branchId,
        tableId: s.tableId,
        tableCode: s.tableCode,
        directionId: s.directionId,
        sessionKey: s.sessionKey,
        cartKey: s.cartKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);