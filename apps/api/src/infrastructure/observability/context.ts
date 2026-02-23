import { AsyncLocalStorage } from "node:async_hooks";

export type ActorContext =
  | { kind: "admin"; id: string; username?: string; role?: string }
  | { kind: "staff"; id: string; username?: string; role?: string; branchId?: string | null }
  | { kind: "client"; id: string; phone?: string };

export type RequestContext = {
  requestId?: string;
  actor?: ActorContext;
  ip?: string;
  userAgent?: string;
};

const als = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return als.run(ctx, fn);
  },

  get(): RequestContext | undefined {
    return als.getStore();
  },

  getRequestId(): string | undefined {
    return als.getStore()?.requestId;
  },

  setActor(actor?: ActorContext) {
    const store = als.getStore();
    if (!store) return;

    if (actor) store.actor = actor;
    else delete store.actor;
  },

  setHttpInfo(input: { ip?: string; userAgent?: string }) {
    const store = als.getStore();
    if (!store) return;

    if (input.ip !== undefined) {
      if (input.ip) store.ip = input.ip;
      else delete store.ip;
    }

    if (input.userAgent !== undefined) {
      if (input.userAgent) store.userAgent = input.userAgent;
      else delete store.userAgent;
    }
  },
};
