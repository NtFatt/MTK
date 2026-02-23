import type { OrderStatus } from "../entities/Order.js";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["RECEIVED", "CANCELED"],
  RECEIVED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["SERVING", "DELIVERING", "COMPLETED", "CANCELED"], // tùy mô hình
  SERVING: ["COMPLETED", "CANCELED"],
  DELIVERING: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
  PAID: [] // payment trigger set PAID (admin không nên tự set)
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}
