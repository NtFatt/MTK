/**
 * Realtime config (Socket.IO) — contract-first.
 * - Default dùng relative URL để Vite proxy hoạt động.
 * - Nếu cần override origin (dev) dùng VITE_SOCKET_ORIGIN.
 */

export const realtimeConfig = {
  socketOrigin: (import.meta.env.VITE_SOCKET_ORIGIN as string | undefined) || undefined,
  socketPath: (import.meta.env.VITE_SOCKET_PATH as string | undefined) || "/socket.io",

  // Debounce invalidation để tránh spam refetch
  invalidateDebounceMs: Number(import.meta.env.VITE_RT_INVALIDATE_DEBOUNCE_MS ?? 350),

  // Join/replay timeouts (best-effort, không crash UX)
  joinAckTimeoutMs: Number(import.meta.env.VITE_RT_JOIN_ACK_TIMEOUT_MS ?? 350),
  replayAckTimeoutMs: Number(import.meta.env.VITE_RT_REPLAY_ACK_TIMEOUT_MS ?? 900),

  // Room naming defaults (có thể thay bằng env nếu BE dùng naming khác)
  internalBranchRoomPrefix:
    (import.meta.env.VITE_RT_INTERNAL_BRANCH_ROOM_PREFIX as string | undefined) || "branch",
  internalOpsRoomPrefix:
    (import.meta.env.VITE_RT_INTERNAL_OPS_ROOM_PREFIX as string | undefined) || "ops",
} as const;
