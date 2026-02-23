import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { authStore } from "../shared/auth/authStore";
import { customerSessionStore } from "../shared/customer/session/sessionStore";
import {
  registerRealtimeQueryClient,
  startRealtime,
  stopRealtime,
} from "../shared/realtime";
import { clearCursorsForUser } from "../shared/realtime/cursorStore";

const queryClient = new QueryClient();
registerRealtimeQueryClient(queryClient);

function AuthHydrate() {
  useEffect(() => {
    authStore.getState().hydrate();
  }, []);
  return null;
}

function CustomerSessionHydrate() {
  useEffect(() => {
    customerSessionStore.getState().hydrate();
  }, []);
  return null;
}

function RealtimeHydrate() {
  useEffect(() => {
    // Internal only: start realtime after auth hydrate.
    type AuthSnapshot = ReturnType<typeof authStore.getState>;

    const onAuthChanged = (state: AuthSnapshot, prev?: AuthSnapshot) => {
      // Wait until storage hydrate has happened; otherwise we'd spam stop/start on first paint.
      if (!state.isHydrated) return;

      const session = state.session;
      const prevSession = prev?.session ?? null;

      const prevUserKey = prevSession?.user?.id != null ? String(prevSession.user.id) : null;
      const userKey = session?.user?.id != null ? String(session.user.id) : null;

      if (!session) {
        if (prevUserKey) clearCursorsForUser(prevUserKey);
        void stopRealtime();
        return;
      }

      // If user switched, clear old cursors and hard-stop to avoid re-joining stale rooms.
      if (prevUserKey && userKey && prevUserKey !== userKey) {
        clearCursorsForUser(prevUserKey);
        void stopRealtime();
      }

      void startRealtime({
        kind: "internal",
        userKey: userKey ?? "internal",
        branchId: session.branchId,
        token: session.accessToken,
      });
    };

    // Fire-immediately equivalent.
    onAuthChanged(authStore.getState(), undefined);

    const unsub = authStore.subscribe((state, prev) => {
      // Only react when relevant fields changed.
      if (state.session === prev.session && state.isHydrated === prev.isHydrated) return;
      onAuthChanged(state, prev);
    });

    return () => {
      unsub();
    };
  }, []);

  return null;
}

/**
 * App-level providers (React Query, auth hydrate).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrate />
      <CustomerSessionHydrate />
      <RealtimeHydrate />
      {children}
    </QueryClientProvider>
  );
}
