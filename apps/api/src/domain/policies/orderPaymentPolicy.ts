import type { OrderStatus } from "../entities/Order.js";

function normalizeOrderPaymentStatus(status: OrderStatus | string | null | undefined): string {
  return String(status ?? "").trim().toUpperCase();
}

export function isOrderPayableStatus(status: OrderStatus | string | null | undefined): boolean {
  const normalized = normalizeOrderPaymentStatus(status);
  return normalized.length > 0 && normalized !== "PAID" && normalized !== "CANCELED" && normalized !== "CANCELLED";
}
