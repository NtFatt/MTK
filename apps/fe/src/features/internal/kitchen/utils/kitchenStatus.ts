import type { AdminOrderStatus } from "../services/adminOrderApi";

export type KitchenStage = "ALL" | "NEW" | "RECEIVED" | "PREPARING" | "READY";

export function normKitchenStatus(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

export function getKitchenStatusMeta(status: string) {
  const normalized = normKitchenStatus(status);

  if (normalized === "NEW") {
    return {
      label: "Mới vào",
      badgeClassName: "border-[#f1d7a2] bg-[#fff3d6] text-[#8f5b17]",
      ringClassName: "ring-[#efb34c]/20",
      dotClassName: "bg-[#efb34c]",
      columnClassName: "border-[#f3dfb7] bg-[#fffaf0]",
    };
  }

  if (normalized === "RECEIVED") {
    return {
      label: "Đã nhận",
      badgeClassName: "border-[#f4c09c] bg-[#fff0e4] text-[#b26023]",
      ringClassName: "ring-[#e48d42]/20",
      dotClassName: "bg-[#e48d42]",
      columnClassName: "border-[#f0d3bd] bg-[#fff7f1]",
    };
  }

  if (normalized === "PREPARING") {
    return {
      label: "Đang chế biến",
      badgeClassName: "border-[#f1b3b3] bg-[#fff0f0] text-[#b13c3c]",
      ringClassName: "ring-[#d75050]/20",
      dotClassName: "bg-[#d75050]",
      columnClassName: "border-[#f0cccc] bg-[#fff8f8]",
    };
  }

  if (normalized === "READY") {
    return {
      label: "Sẵn sàng",
      badgeClassName: "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]",
      ringClassName: "ring-[#7cad54]/20",
      dotClassName: "bg-[#7cad54]",
      columnClassName: "border-[#d6e7c8] bg-[#f7fbf3]",
    };
  }

  return {
    label: normalized || "UNKNOWN",
    badgeClassName: "border-border bg-background text-foreground",
    ringClassName: "ring-border/20",
    dotClassName: "bg-border",
    columnClassName: "border-border bg-background",
  };
}

export function getKitchenNextAction(status: string):
  | {
      to: AdminOrderStatus;
      label: string;
      description: string;
    }
  | null {
  const normalized = normKitchenStatus(status);

  if (normalized === "NEW") {
    return {
      to: "RECEIVED",
      label: "Nhận đơn",
      description: "Xác nhận bếp đã tiếp nhận ticket này.",
    };
  }

  if (normalized === "RECEIVED") {
    return {
      to: "PREPARING",
      label: "Bắt đầu chế biến",
      description: "Chuyển ticket sang bếp khi đã sẵn sàng lên món.",
    };
  }

  if (normalized === "PREPARING") {
    return {
      to: "READY",
      label: "Đánh dấu sẵn sàng",
      description: "Món đã hoàn tất và sẵn sàng chuyển ra pass.",
    };
  }

  return null;
}
