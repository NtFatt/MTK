/**
 * Customer session persistence (sessionStorage).
 * Key: hadilao.customer.session
 */
import type { CustomerSession } from "./types";

const KEY = "hadilao.customer.session";

export function loadCustomerSession(): CustomerSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }
}

export function saveCustomerSession(session: CustomerSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // no-op
  }
}

export function clearCustomerSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
