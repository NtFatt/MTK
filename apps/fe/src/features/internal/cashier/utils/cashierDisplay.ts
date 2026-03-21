export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Không rõ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Không rõ";
  return new Date(ts).toLocaleString("vi-VN");
}

export function formatElapsedFrom(value?: string | null): string {
  if (!value) return "Không rõ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Không rõ";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function getSeatAnchor(value: {
  sessionOpenedAt?: string | null;
  createdAt?: string | null;
}): string | null {
  return value.sessionOpenedAt ?? value.createdAt ?? null;
}

export function getCashierTotal(value: {
  totalAmount?: number | null;
  subtotalAmount?: number | null;
}): number {
  const raw = value.totalAmount ?? value.subtotalAmount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function roundUp(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  return Math.ceil(value / step) * step;
}

export function getCashierStatusMeta(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "NEW") {
    return {
      label: "Mới vào",
      badgeClassName: "border-[#f1d7a2] bg-[#fff3d6] text-[#8f5b17]",
      accentClassName: "border-l-[#efb34c]",
    };
  }
  if (normalized === "RECEIVED") {
    return {
      label: "Đã nhận",
      badgeClassName: "border-[#f4c09c] bg-[#fff0e4] text-[#b26023]",
      accentClassName: "border-l-[#e48d42]",
    };
  }
  if (normalized === "PREPARING") {
    return {
      label: "Đang chế biến",
      badgeClassName: "border-[#f1b3b3] bg-[#fff0f0] text-[#b13c3c]",
      accentClassName: "border-l-[#d75050]",
    };
  }
  if (normalized === "READY") {
    return {
      label: "Chờ thanh toán",
      badgeClassName: "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]",
      accentClassName: "border-l-[#7cad54]",
    };
  }
  if (normalized === "PAID") {
    return {
      label: "Đã thanh toán",
      badgeClassName: "border-[#bad7d4] bg-[#edf9f7] text-[#2d6d66]",
      accentClassName: "border-l-[#53a69b]",
    };
  }

  return {
    label: normalized || "UNKNOWN",
    badgeClassName: "border-border bg-background text-foreground",
    accentClassName: "border-l-border",
  };
}
