import type { HttpError } from "../../http/errors";
import { customerSessionStore } from "./sessionStore";

const RECOVERY_KEY = "hadilao.customer.session.recovery";

export type CustomerSessionRecoveryReason = "SESSION_CLOSED" | "SESSION_NOT_FOUND";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readRecoveryReason(): CustomerSessionRecoveryReason | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(RECOVERY_KEY);
    if (raw === "SESSION_CLOSED" || raw === "SESSION_NOT_FOUND") {
      return raw;
    }
  } catch {
    // no-op
  }

  return null;
}

function writeRecoveryReason(reason: CustomerSessionRecoveryReason) {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(RECOVERY_KEY, reason);
  } catch {
    // no-op
  }
}

function clearRecoveryReason() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // no-op
  }
}

export function getCustomerSessionRecoveryReason(): CustomerSessionRecoveryReason | null {
  return readRecoveryReason();
}

export function clearCustomerSessionRecoveryReason() {
  clearRecoveryReason();
}

export function formatCustomerSessionRecoveryMessage(
  reason: CustomerSessionRecoveryReason,
): string {
  switch (reason) {
    case "SESSION_NOT_FOUND":
      return "Phiên bàn không còn tồn tại trên thiết bị này. Vui lòng mở bàn lại để tiếp tục đặt món.";
    case "SESSION_CLOSED":
    default:
      return "Phiên bàn vừa hết hiệu lực hoặc đã đóng. Vui lòng xác nhận bàn lại để tiếp tục đặt món.";
  }
}

export function isCustomerSessionInvalidError(error: unknown): error is HttpError {
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? String((error as { code: string }).code)
    : "";

  return code === "SESSION_CLOSED" || code === "SESSION_NOT_FOUND";
}

export function recoverInvalidCustomerSession(
  error: unknown,
  options?: { beforeClear?: () => void },
): boolean {
  if (!isCustomerSessionInvalidError(error)) return false;

  const reason = String((error as { code: string }).code) as CustomerSessionRecoveryReason;

  options?.beforeClear?.();
  writeRecoveryReason(reason);
  customerSessionStore.getState().clear();
  return true;
}
