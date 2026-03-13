import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";

import { authStore } from "../auth/authStore";
import { registerRealtimeQueryClient } from "./eventRouter";
import { startRealtime, stopRealtime } from "./realtimeManager";

type Props = {
  queryClient: QueryClient;
};

export function RealtimeBootstrap({ queryClient }: Props) {
  const session = useStore(authStore, (s) => s.session);

  useEffect(() => {
    registerRealtimeQueryClient(queryClient);
  }, [queryClient]);

  useEffect(() => {
    const token = session?.accessToken;
    const userKey = session?.user?.id;

    if (!token || !userKey) {
      void stopRealtime();
      return;
    }

    void startRealtime({
      kind: "internal",
      userKey: String(userKey),
      branchId: session?.branchId != null ? String(session.branchId) : undefined,
      token,
    });
  }, [
    session?.accessToken,
    session?.user?.id,
    session?.branchId,
  ]);

  return null;
}