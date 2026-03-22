import type {
  PayrollBonusType,
  PayrollSalaryMode,
} from "../services/payrollApi";

export function getCurrentPayrollMonth() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 7);
}

export function getDefaultBusinessDate(month: string) {
  const currentMonth = getCurrentPayrollMonth();
  if (month === currentMonth) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }
  return `${month}-01`;
}

export function formatPayrollCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPayrollMonthLabel(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, monthNum] = month.split("-");
  return `Tháng ${monthNum}/${year}`;
}

export function formatPayrollDate(value?: string | null) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

export function formatPayrollDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatWorkedDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 giờ";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  if (rest === 0) return `${hours} giờ`;
  return `${hours} giờ ${rest} phút`;
}

export function getSalaryModeLabel(mode?: PayrollSalaryMode | null) {
  switch (String(mode ?? "").toUpperCase()) {
    case "MONTHLY":
      return "Lương tháng";
    case "HOURLY":
      return "Lương giờ";
    case "SHIFT":
      return "Lương theo ca";
    default:
      return "Chưa cấu hình";
  }
}

export function getBonusTypeLabel(type?: PayrollBonusType | null) {
  switch (String(type ?? "").toUpperCase()) {
    case "PERFORMANCE":
      return "Thưởng hiệu suất";
    case "ADJUSTMENT":
      return "Điều chỉnh";
    case "OTHER":
      return "Khác";
    default:
      return "Khoản thưởng";
  }
}

export function getStaffRoleLabel(role?: string | null) {
  switch (String(role ?? "").toUpperCase()) {
    case "BRANCH_MANAGER":
      return "Quản lý chi nhánh";
    case "STAFF":
      return "Phục vụ";
    case "KITCHEN":
      return "Bếp";
    case "CASHIER":
      return "Thu ngân";
    case "ADMIN":
      return "Admin";
    default:
      return role || "—";
  }
}
