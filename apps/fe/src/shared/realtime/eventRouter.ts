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
  if (env.room.startsWith("order:")) {
    const rest = env.room.slice("order:".length);
    if (rest) return rest;
  }

  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;

  const orderObj =
    payload?.order && typeof payload.order === "object"
      ? (payload.order as Record<string, unknown>)
      : null;

  const dataObj =
    payload?.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;

  const candidates = [
    payload?.orderCode,
    payload?.code,
    orderObj?.orderCode,
    orderObj?.code,
    dataObj?.orderCode,
    dataObj?.code,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }

  return null;
}

function tryExtractReservationCode(env: EventEnvelope): string | null {
  if (env.room.startsWith("reservation:")) {
    const rest = env.room.slice("reservation:".length);
    if (rest) return rest;
  }

  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;

  const reservationObj =
    payload?.reservation && typeof payload.reservation === "object"
      ? (payload.reservation as Record<string, unknown>)
      : null;

  const dataObj =
    payload?.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;

  const candidates = [
    payload?.reservationCode,
    payload?.code,
    reservationObj?.reservationCode,
    reservationObj?.code,
    dataObj?.reservationCode,
    dataObj?.code,
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

  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;

  const candidates = [scope?.sessionKey, scope?.session_key];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }

  return null;
}

function tryExtractBranchId(env: EventEnvelope): string | number | null {
  const roomPrefixes = ["branch:", "shift:", "kitchen:", "cashier:", "inventory:", "ops:"];

  for (const prefix of roomPrefixes) {
    if (env.room.startsWith(prefix)) {
      const rest = env.room.slice(prefix.length);
      if (!rest) break;

      const n = Number(rest);
      return Number.isFinite(n) ? n : rest;
    }
  }

  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;

  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;

  const raw =
    scope?.branchId ??
    scope?.branch_id ??
    payload?.branchId ??
    payload?.branch_id;

  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }

  if (typeof raw === "number") return raw;

  return null;
}

function enqueueInvalidate(queryKey: readonly unknown[], exact = false) {
  if (!debouncer) return;
  debouncer.enqueue({ queryKey, exact });
}

function enqueueMenuRefresh() {
  enqueueInvalidate(["menu", "view"], false);
}

function enqueueVoucherRefresh() {
  enqueueInvalidate(["vouchers", "available"], false);
}

function enqueueDashboardRefresh(branchId?: string | number | null) {
  if (branchId != null) {
    enqueueInvalidate(qk.dashboard.overview({ branchId }), false);
    return;
  }
  enqueueInvalidate(["dashboard", "overview"], false);
}

function enqueueCashierRefresh(branchId?: string | number | null) {
  if (branchId != null) {
    enqueueInvalidate(qk.orders.cashierUnpaid({ branchId }), false);
    return;
  }
  enqueueInvalidate(["orders", "cashier", "unpaid"], false);
}

function enqueueShiftRefresh(branchId?: string | number | null) {
  if (branchId != null) {
    enqueueInvalidate(["shifts", "current", { branchId }], false);
    enqueueInvalidate(["shifts", "history", { branchId }], false);
    return;
  }
  enqueueInvalidate(["shifts", "current"], false);
  enqueueInvalidate(["shifts", "history"], false);
}

function enqueueOrderCenterRefresh() {
  enqueueInvalidate(["orders", "list"], false);
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

const PAYMENT_EVENTS = new Set([
  "payment.success",
  "payment.updated",
  "payment.completed",
]);

const TABLE_SESSION_EVENTS = new Set([
  "table.session.opened",
  "table.session.closed",
  "table.session.updated",
]);

const RESERVATION_EVENTS = new Set([
  "reservation.created",
  "reservation.updated",
  "reservation.status.changed",
  "reservation.status_changed",
]);

const INVENTORY_EVENTS = new Set([
  "inventory.updated",
  "inventory.stock.updated",
  "inventory.adjusted",
  "inventory.hold.updated",
  "inventory.holds.updated",
  "inventory.reserved",
  "inventory.released",
]);

const SHIFT_EVENTS = new Set([
  "shift.opened",
  "shift.closed",
  "shift.updated",
]);

export function routeRealtimeEvent(env: EventEnvelope) {
  if (!queryClient || !debouncer) return;

  const type = env.type;
  const branchId = tryExtractBranchId(env);

  // 0) Gap -> hard refetch known room domains
  if (type === "realtime.gap") {
    const orderCode = tryExtractOrderCode(env);
    if (orderCode) enqueueInvalidate(qk.orders.byCode(orderCode), true);

    const reservationCode = tryExtractReservationCode(env);
    if (reservationCode) {
      enqueueInvalidate(["public", "reservations", "detail", reservationCode], true);
    }

    const sk = tryExtractSessionKey(env);
    if (sk) {
      enqueueInvalidate(qk.cart.bySessionKey(sk), true);
      enqueueInvalidate(qk.sessions.detail(sk), true);
      enqueueMenuRefresh();
    }

    if (branchId != null) {
      const b = String(branchId);
      enqueueInvalidate(["ops", "tables", "list"], false);
      enqueueInvalidate(["orders", "kitchen", "queue"], false);
      enqueueOrderCenterRefresh();
      enqueueCashierRefresh(branchId);
      enqueueInvalidate(["inventory", "stock"], false);
      enqueueInvalidate(["inventory", "holds"], false);
      enqueueInvalidate(["inventory", "adjustments"], false);
      enqueueInvalidate(["reservations", "list"], false);
      enqueueDashboardRefresh(branchId);

      enqueueInvalidate(["inventory-ingredients", b], false);
      enqueueInvalidate(["inventory-ingredient-alerts", b], false);
      enqueueMenuRefresh();
    }
    return;
  }

  // 1) Cart
  if (type === "cart.updated" || type === "cart.abandoned") {
    const sk = tryExtractSessionKey(env);
    if (sk) {
      enqueueInvalidate(qk.cart.bySessionKey(sk), true);
      enqueueMenuRefresh();
      enqueueVoucherRefresh();
    }
    if (branchId != null) {
      enqueueInvalidate(["ops", "tables", "list"], false);
    }
    return;
  }

  // 2) Orders
  if (ORDER_EVENTS.has(type)) {
    const orderCode = tryExtractOrderCode(env);
    if (orderCode) enqueueInvalidate(qk.orders.byCode(orderCode), true);

    const sk = tryExtractSessionKey(env);
    if (sk) {
      enqueueInvalidate(qk.cart.bySessionKey(sk), true);
      enqueueMenuRefresh();
      enqueueVoucherRefresh();
    }

    if (branchId != null) {
      const b = String(branchId);

      enqueueInvalidate(["orders", "kitchen", "queue"], false);
      enqueueOrderCenterRefresh();
      enqueueCashierRefresh(branchId);
      enqueueInvalidate(["ops", "tables", "list"], false);
      enqueueDashboardRefresh(branchId);

      enqueueInvalidate(["inventory-ingredients", b], false);
      enqueueInvalidate(["inventory-ingredient-alerts", b], false);
      enqueueMenuRefresh();
    }
    return;
  }

  // 3) Payment
  if (PAYMENT_EVENTS.has(type)) {
    const orderCode = tryExtractOrderCode(env);
    if (orderCode) enqueueInvalidate(qk.orders.byCode(orderCode), true);

    const sk = tryExtractSessionKey(env);
    if (sk) {
      enqueueInvalidate(qk.cart.bySessionKey(sk), true);
      enqueueInvalidate(qk.sessions.detail(sk), true);
      enqueueMenuRefresh();
      enqueueVoucherRefresh();
    }

    if (branchId != null) {
      enqueueOrderCenterRefresh();
      enqueueCashierRefresh(branchId);
      enqueueDashboardRefresh(branchId);
    }
    return;
  }

  // 3b) Shifts
  if (SHIFT_EVENTS.has(type)) {
    if (branchId != null) {
      enqueueShiftRefresh(branchId);
      enqueueCashierRefresh(branchId);
      enqueueDashboardRefresh(branchId);
    } else {
      enqueueShiftRefresh(null);
    }
    return;
  }

  // 4) Table sessions
  if (TABLE_SESSION_EVENTS.has(type)) {
    if (branchId != null) {
      enqueueInvalidate(["ops", "tables", "list"], false);
      enqueueDashboardRefresh(branchId);
    }

    const sk = tryExtractSessionKey(env);
    if (sk) {
      enqueueInvalidate(qk.sessions.detail(sk), true);
      enqueueInvalidate(qk.cart.bySessionKey(sk), true);
      enqueueMenuRefresh();
      enqueueVoucherRefresh();
    }

    return;
  }

  // 5) Reservations
  if (RESERVATION_EVENTS.has(type)) {
    const reservationCode = tryExtractReservationCode(env);

    if (reservationCode) {
      enqueueInvalidate(["public", "reservations", "detail", reservationCode], true);
    }

    // availability page không có room riêng -> broad invalidate/query refresh
    enqueueInvalidate(["public", "reservations", "availability"], false);

    if (branchId != null) {
      enqueueInvalidate(["ops", "tables", "list"], false);
      enqueueInvalidate(["reservations", "list"], false);
      enqueueDashboardRefresh(branchId);
    }

    return;
  }

  // 6) Inventory
  if (INVENTORY_EVENTS.has(type)) {
    if (branchId != null) {
      const b = String(branchId);

      enqueueInvalidate(["inventory", "stock"], false);
      enqueueInvalidate(["inventory", "holds"], false);
      enqueueInvalidate(["inventory", "adjustments"], false);
      enqueueDashboardRefresh(branchId);

      enqueueInvalidate(["inventory-ingredients", b], false);
      enqueueInvalidate(["inventory-ingredient-alerts", b], false);
    }

    enqueueMenuRefresh();

    if (tryExtractSessionKey(env)) {
      enqueueVoucherRefresh();
    }
    return;
  }
}
