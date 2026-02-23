import { useNavigate } from "react-router-dom";
import { useAppMutation } from "../../../shared/http/useAppMutation";
import { customerSessionStore } from "./sessionStore";
import { openSession, type OpenSessionPayload } from "./sessionApi";

export function useOpenSessionMutation(options?: { next?: string | null }) {
  const navigate = useNavigate();

  return useAppMutation({
    mutationFn: (payload: OpenSessionPayload) => openSession(payload),
    onSuccess: (session) => {
      customerSessionStore.getState().setSession(session);
      const next = options?.next ? String(options.next) : "";
      const qs = next ? `?next=${encodeURIComponent(next)}` : "";
      navigate(`/c/session/${encodeURIComponent(session.sessionKey)}${qs}`, { replace: true });
    },
  });
}
