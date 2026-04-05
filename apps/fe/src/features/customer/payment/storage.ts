const LAST_PAYMENT_ORDER_KEY = "duong_hanh_phuc.payment.lastOrderCode";

export function setLastPaymentOrderCode(orderCode: string) {
  sessionStorage.setItem(LAST_PAYMENT_ORDER_KEY, orderCode);
}

export function getLastPaymentOrderCode(): string | null {
  return sessionStorage.getItem(LAST_PAYMENT_ORDER_KEY);
}

export function clearLastPaymentOrderCode() {
  sessionStorage.removeItem(LAST_PAYMENT_ORDER_KEY);
}