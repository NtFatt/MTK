import { io, type Socket } from "socket.io-client";
import { realtimeConfig } from "./config";
import type { RealtimeContext } from "./types";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const opts = {
    path: realtimeConfig.socketPath,
    autoConnect: false,
  } as const;

  // If socketOrigin provided, connect to that origin; otherwise use relative (proxy-friendly).
  socket = realtimeConfig.socketOrigin ? io(realtimeConfig.socketOrigin, opts) : io(opts);
  return socket;
}

export function applySocketAuth(ctx: RealtimeContext | null) {
  const s = socket;
  if (!s) return;

  // Socket.IO reads auth on connect; for reconnect you can set socket.auth then connect.
  // Don't log tokens.
  if (ctx?.token) {
    s.auth = { token: ctx.token };
  } else {
    s.auth = undefined as any;
  }
}

export function destroySocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    // ignore
  }
  socket = null;
}
