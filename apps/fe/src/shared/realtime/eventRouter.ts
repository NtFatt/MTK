import type { QueryClient } from "@tanstack/react-query";
import { qk } from "@hadilao/contracts";
import type { EventEnvelope } from "./types";
import { createInvalidateDebouncer } from "./invalidateDebounce";
import { realtimeConfig } from "./config";

let queryClient: QueryClient | null = null;
let debouncer: ReturnType<typeof createInvalidateDebouncer> | null = null;

export function registerRealtimeQueryClient(client: QueryClient) {
  queryClient = client;
  debouncer = createInvalidateDebouncer(client, realtimeConfig.invalidateDebounceMs);
}

function tryExtractOrderCode(env: EventEnvelope): string | null {
  // common room naming: order:<orderCode>
  if (env.room.startsWith("order:")) {
    const rest = env.room.slice("order:".length);
    if (rest) return rest;
  }

  const p: any = env.payload as any;
  const candidates = [
    p?.orderCode,
    p?.code,
    p?.order?.orderCode,
    p?.order?.code,
    p?.data?.orderCode,
    p?.data?.code,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function tryExtractSessionKey(env: EventEnvelope): string | null {
  if (env.room.startsWith("sessionKey:")) {
    const rest = env.room.slice("sessionKey:".length);
    if (rest) return rest;
  }

  const s: any = env.scope as any;
  const candidates = [s?.sessionKey, s?.session_key];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function tryExtractBranchId(env: EventEnvelope): string | number | null {
  const room = env.room;
  const roomPrefixes = ["branch:", "kitchen:", "cashier:"];
  for (const p of roomPrefixes) {
    if (room.startsWith(p)) {
      const rest = room.slice(p.length);
      if (!rest) break;
      const n = Number(rest);
      return Number.isFinite(n) ? n : rest;
    }
  }
  const s: any = env.scope as any;
  const b = s?.branchId ?? s?.branch_id;
  if (typeof b === "string" && b.trim()) {
    const n = Number(b);
    return Number.isFinite(n) ? n : b;
  }
  if (typeof b === "number") return b;
  return null;
}

function enqueueInvalidate(queryKey: readonly unknown[], exact = false) {

  if (!debouncer) return;
  debouncer.enqueue({ queryKey, exact });
}
const ORDER_EVENTS = new Set([
  "order.created",
  "order.updated",
  "order.status_changed",
  "order.status.changed",
  "order.statusChanged",
  "order.status_updated",
  "order.status.change",
]);

export function routeRealtimeEvent(env: EventEnvelope) {
  if (!queryClient || !debouncer) return;

  const type = env.type;

  // ---- Strict invalidate matrix (aligned to BE event types + room naming) ----
  // Event types observed in BE (SocketGateway + use-cases):
  // - cart.updated | cart.abandoned
  // - order.created | order.status_changed | order.status.changed
  // - payment.success
  // - table.session.opened | table.session.closed
  // - reservation.created | reservation.status.changed

  // 0) Gap (out-of-window) -> hard refetch for known room types
  if (type === "realtime.gap") {
    const orderCode = tryExtractOrderCode(env);
    if (orderCode) enqueueInvalidate(qk.orders.byCode(orderCode), true);

    const sk = tryExtractSessionKey(env);
    if (sk) {
      enqueueInvalidate(qk.cart.bySessionKey(sk), true);
      enqueueInvalidate(qk.sessions.detail(sk), true);
    }

    const branchId = tryExtractBranchId(env);
    if (branchId != null) enqueueInvalidate(qk.ops.tables.list({ branchId }), true);
    return;
  }

  // 1) Cart
  if (type === "cart.updated" || type === "cart.abandoned") {
    const sk = tryExtractSessionKey(env);
    if (!sk) return;
    enqueueInvalidate(qk.cart.bySessionKey(sk), true);
    // Internal ops tables view may expose cartKey/sessionKey per table.
    const branchId = tryExtractBranchId(env);
    if (branchId != null) enqueueInvalidate(qk.ops.tables.list({ branchId }), true);
    return;
  }

  // 2) Orders
  if (ORDER_EVENTS.has(type)) {
    const orderCode = tryExtractOrderCode(env);
    if (orderCode) enqueueInvalidate(qk.orders.byCode(orderCode), true);

    const sk = tryExtractSessionKey(env);
    if (sk) enqueueInvalidate(qk.cart.bySessionKey(sk), true);

    const branchId = tryExtractBranchId(env);
    if (branchId != null) {
      // ✅ prefix invalidate (exact=false) để match cả key có thêm filters object
      enqueueInvalidate(qk.orders.kitchenQueue({ branchId }), false);
    }
    return;
  }
  // 3) Payment
  if (type === "payment.success") {
    const orderCode = tryExtractOrderCode(env);
    if (orderCode) enqueueInvalidate(qk.orders.byCode(orderCode), true);
    return;
  }

  // 4) Table sessions
  if (type === "table.session.opened" || type === "table.session.closed") {
    const branchId = tryExtractBranchId(env);
    if (branchId != null) enqueueInvalidate(qk.ops.tables.list({ branchId }), true);

    const sk = tryExtractSessionKey(env);
    if (sk) enqueueInvalidate(qk.sessions.detail(sk), true);
    return;
  }

  // 5) Reservations
  if (type === "reservation.created" || type === "reservation.status.changed") {
    const branchId = tryExtractBranchId(env);
    if (branchId != null) enqueueInvalidate(qk.ops.tables.list({ branchId }), true);
    return;
  }
}
