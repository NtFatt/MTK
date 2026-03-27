import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { hasPermission } from "../../../../shared/auth/permissions";
import { Alert, AlertDescription, AlertTitle } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { cn } from "../../../../shared/utils/cn";
import { useAttendanceBoardQuery } from "../hooks/useAttendanceBoardQuery";
import { useAttendanceMutations } from "../hooks/useAttendanceMutations";
import { useStaffAttendanceHistoryQuery } from "../hooks/useStaffAttendanceHistoryQuery";
import { useRealtimeRoom } from "../../../../shared/realtime/useRealtimeRoom";
import type {
  AttendanceBoardRow,
  AttendanceRole,
  AttendanceShiftCode,
  AttendanceStatus,
} from "../services/attendanceApi";

const SHIFT_OPTIONS: ReadonlyArray<{ code: AttendanceShiftCode; label: string }> = [
  { code: "MORNING", label: "Ca sáng" },
  { code: "EVENING", label: "Ca chiều" },
];

const ROLE_OPTIONS: ReadonlyArray<{ value: "ALL" | AttendanceRole; label: string }> = [
  { value: "ALL", label: "Tất cả role" },
  { value: "BRANCH_MANAGER", label: "Quản lý chi nhánh" },
  { value: "STAFF", label: "Phục vụ" },
  { value: "KITCHEN", label: "Bếp" },
  { value: "CASHIER", label: "Thu ngân" },
];

const STATUS_OPTIONS: ReadonlyArray<{ value: "ALL" | AttendanceStatus; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "NOT_CHECKED_IN", label: "Chưa check-in" },
  { value: "PRESENT", label: "Đúng giờ" },
  { value: "LATE", label: "Đi trễ" },
  { value: "EARLY_LEAVE", label: "Về sớm" },
  { value: "MISSING_CHECKOUT", label: "Thiếu checkout" },
  { value: "ABSENT", label: "Vắng mặt" },
  { value: "CORRECTED", label: "Đã chỉnh sửa" },
];

function getTodayDateOnly() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function getDefaultShiftCode(): AttendanceShiftCode {
  return new Date().getHours() < 16 ? "MORNING" : "EVENING";
}

function toDateTimeLocalInput(value?: string | null) {
  const base = value ? new Date(value) : new Date();
  if (Number.isNaN(base.getTime())) return "";
  const offset = base.getTimezoneOffset();
  return new Date(base.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
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

function formatDuration(minutes?: number | null) {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

function getRoleLabel(role: string) {
  switch (String(role).toUpperCase()) {
    case "BRANCH_MANAGER":
      return "Quản lý";
    case "STAFF":
      return "Phục vụ";
    case "KITCHEN":
      return "Bếp";
    case "CASHIER":
      return "Thu ngân";
    default:
      return role;
  }
}

function getStatusMeta(status: string) {
  switch (String(status).toUpperCase()) {
    case "PRESENT":
      return { label: "Đúng giờ", className: "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]" };
    case "LATE":
      return { label: "Đi trễ", className: "border-[#f1d7a2] bg-[#fff3d6] text-[#8f5b17]" };
    case "EARLY_LEAVE":
      return { label: "Về sớm", className: "border-[#f4c09c] bg-[#fff0e4] text-[#b26023]" };
    case "MISSING_CHECKOUT":
      return { label: "Thiếu checkout", className: "border-[#f1b8b8] bg-[#fff1f1] text-[#a03f3f]" };
    case "ABSENT":
      return { label: "Vắng mặt", className: "border-[#ddd2c4] bg-[#f8f4ef] text-[#72563d]" };
    case "CORRECTED":
      return { label: "Đã chỉnh sửa", className: "border-[#dacbf2] bg-[#f5efff] text-[#6b4a96]" };
    case "NOT_CHECKED_IN":
      return { label: "Chưa check-in", className: "border-[#ead8c0] bg-[#fffaf4] text-[#6d4928]" };
    default:
      return { label: status || "Không rõ", className: "border-[#ead8c0] bg-[#fffaf4] text-[#6d4928]" };
  }
}

function getSourceLabel(source: string | null) {
  switch (String(source ?? "").toUpperCase()) {
    case "SELF":
      return "Tự chấm công";
    case "MANAGER_MANUAL":
      return "Manager thủ công";
    case "AUTO_FROM_SHIFT":
      return "Tự động từ ca";
    case "CORRECTION":
      return "Chỉnh sửa";
    default:
      return "Chưa ghi nhận";
  }
}

function countStatuses(rows: AttendanceBoardRow[]) {
  return {
    total: rows.length,
    checkedIn: rows.filter((row) => !["NOT_CHECKED_IN", "ABSENT"].includes(row.status)).length,
    late: rows.filter((row) => row.status === "LATE").length,
    missingCheckout: rows.filter((row) => row.status === "MISSING_CHECKOUT").length,
    absent: rows.filter((row) => row.status === "ABSENT").length,
  };
}

type AttendanceActionDraft = {
  rowKey: string;
  performedAt: string;
  note: string;
};

function buildAttendanceActionDraft(rowKey = ""): AttendanceActionDraft {
  return {
    rowKey,
    performedAt: toDateTimeLocalInput(),
    note: "",
  };
}

function StaffRow({
  row,
  selected,
  onSelect,
}: {
  row: AttendanceBoardRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = getStatusMeta(row.status);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition",
        selected
          ? "border-[#cf5b42] bg-[#fff5ef] shadow-[0_12px_32px_rgba(198,117,54,0.14)]"
          : "border-[#ead8c0] bg-white hover:border-[#d8b18a] hover:bg-[#fffaf4]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[#4e2916]">
            {row.staffName || row.username}
          </div>
          <div className="mt-1 text-sm text-[#8a684d]">
            @{row.username} • {getRoleLabel(row.staffRole)}
          </div>
        </div>
        <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", status.className)}>
          {status.label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#6b4e36] sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[#b48b63]">Khung giờ</div>
          <div className="mt-1">
            {row.startTime.slice(0, 5)} → {row.endTime.slice(0, 5)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-[#b48b63]">Check-in / out</div>
          <div className="mt-1">
            {row.checkInAt ? formatDateTime(row.checkInAt) : "—"} / {row.checkOutAt ? formatDateTime(row.checkOutAt) : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {row.lateMinutes > 0 && (
          <Badge className="rounded-full border-[#f1d7a2] bg-[#fff8ea] text-[#8f5b17]">
            Trễ {row.lateMinutes} phút
          </Badge>
        )}
        {row.earlyLeaveMinutes > 0 && (
          <Badge className="rounded-full border-[#f4c09c] bg-[#fff0e4] text-[#b26023]">
            Về sớm {row.earlyLeaveMinutes} phút
          </Badge>
        )}
        {row.isOpen && (
          <Badge className="rounded-full border-[#bad7d4] bg-[#edf9f7] text-[#2d6d66]">
            Đang mở
          </Badge>
        )}
        {row.isCorrected && (
          <Badge className="rounded-full border-[#dacbf2] bg-[#f5efff] text-[#6b4a96]">
            Có correction
          </Badge>
        )}
      </div>
    </button>
  );
}

export function InternalAttendancePage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (state) => state.session);

  const canRead = hasPermission(session, "attendance.read");
  const canManage = hasPermission(session, "attendance.manage");
  const resolvedBranchId = String(branchId ?? "").trim();

  const [businessDate, setBusinessDate] = useState(getTodayDateOnly());
  const [shiftCode, setShiftCode] = useState<AttendanceShiftCode>(getDefaultShiftCode());
  const [roleFilter, setRoleFilter] = useState<"ALL" | AttendanceRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AttendanceStatus>("ALL");
  const [search, setSearch] = useState("");
  const [selectedRowKey, setSelectedRowKey] = useState("");
  const [actionDraft, setActionDraft] = useState<AttendanceActionDraft>(() =>
    buildAttendanceActionDraft(),
  );

  const boardQuery = useAttendanceBoardQuery({
    branchId: resolvedBranchId,
    businessDate,
    shiftCode,
    role: roleFilter === "ALL" ? null : roleFilter,
    status: statusFilter === "ALL" ? null : statusFilter,
    q: search,
    enabled: canRead,
  });

  useRealtimeRoom(`ops:${resolvedBranchId}`, canRead && Boolean(resolvedBranchId));

  const items = useMemo(() => boardQuery.data?.items ?? [], [boardQuery.data?.items]);

  const effectiveSelectedRowKey = useMemo(() => {
    if (!items.length) return "";
    return items.some((row) => row.rowKey === selectedRowKey) ? selectedRowKey : items[0]!.rowKey;
  }, [items, selectedRowKey]);

  const selectedRow = useMemo(
    () => items.find((row) => row.rowKey === effectiveSelectedRowKey) ?? null,
    [effectiveSelectedRowKey, items],
  );

  const currentActionDraft = useMemo(() => {
    if (!effectiveSelectedRowKey) return buildAttendanceActionDraft();
    return actionDraft.rowKey === effectiveSelectedRowKey
      ? actionDraft
      : buildAttendanceActionDraft(effectiveSelectedRowKey);
  }, [actionDraft, effectiveSelectedRowKey]);

  const historyQuery = useStaffAttendanceHistoryQuery({
    branchId: resolvedBranchId,
    staffId: selectedRow?.staffId,
    enabled: canRead && Boolean(selectedRow?.staffId),
    limit: 8,
  });

  const summary = useMemo(() => countStatuses(items), [items]);
  const statusMeta = selectedRow ? getStatusMeta(selectedRow.status) : null;

  const {
    checkInMutation,
    checkOutMutation,
    markAbsentMutation,
  } = useAttendanceMutations();

  const isBusy =
    checkInMutation.isPending || checkOutMutation.isPending || markAbsentMutation.isPending;

  const canCheckIn =
    selectedRow != null &&
    !selectedRow.isOpen &&
    (selectedRow.isPlaceholder ||
      selectedRow.status === "NOT_CHECKED_IN" ||
      selectedRow.status === "ABSENT");
  const canCheckOut = selectedRow != null && !!selectedRow.attendanceId && selectedRow.isOpen;
  const canMarkAbsent =
    selectedRow != null &&
    !selectedRow.isOpen &&
    selectedRow.status !== "ABSENT" &&
    (selectedRow.isPlaceholder || selectedRow.status === "NOT_CHECKED_IN");

  function handleSelectRow(rowKey: string) {
    setSelectedRowKey(rowKey);
    setActionDraft(buildAttendanceActionDraft(rowKey));
  }

  function updateActionDraft(patch: Partial<Omit<AttendanceActionDraft, "rowKey">>) {
    setActionDraft((previous) => {
      const base =
        previous.rowKey === effectiveSelectedRowKey
          ? previous
          : buildAttendanceActionDraft(effectiveSelectedRowKey);
      return {
        ...base,
        ...patch,
        rowKey: effectiveSelectedRowKey,
      };
    });
  }

  async function handleCheckIn() {
    if (!selectedRow) return;
    await checkInMutation.mutateAsync({
      staffId: selectedRow.staffId,
      payload: {
        branchId: resolvedBranchId,
        businessDate,
        shiftCode,
        performedAt: new Date(currentActionDraft.performedAt).toISOString(),
        note: currentActionDraft.note,
      },
    });
    setActionDraft(buildAttendanceActionDraft(effectiveSelectedRowKey));
  }

  async function handleCheckOut() {
    if (!selectedRow?.attendanceId || selectedRow.version == null) return;
    await checkOutMutation.mutateAsync({
      attendanceId: selectedRow.attendanceId,
      payload: {
        branchId: resolvedBranchId,
        performedAt: new Date(currentActionDraft.performedAt).toISOString(),
        note: currentActionDraft.note,
        expectedVersion: selectedRow.version,
      },
    });
    setActionDraft(buildAttendanceActionDraft(effectiveSelectedRowKey));
  }

  async function handleMarkAbsent() {
    if (!selectedRow) return;
    await markAbsentMutation.mutateAsync({
      staffId: selectedRow.staffId,
      payload: {
        branchId: resolvedBranchId,
        businessDate,
        shiftCode,
        note: currentActionDraft.note,
      },
    });
    setActionDraft(buildAttendanceActionDraft(effectiveSelectedRowKey));
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#4e2916]">Attendance</h1>
          <p className="mt-3 text-lg text-[#8b6a50]">Chi nhánh: {resolvedBranchId}</p>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Không đủ quyền</AlertTitle>
          <AlertDescription>
            Tài khoản hiện tại chưa có quyền xem board chấm công (`attendance.read`).
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-[#e7d2b8] bg-[#fffaf4] shadow-[0_18px_40px_rgba(184,130,73,0.10)]">
        <CardContent className="flex flex-col gap-5 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.4em] text-[#b48b63]">Attendance Center</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#4e2916]">
              Bảng chấm công chi nhánh {resolvedBranchId}
            </h1>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-full border-[#d9bb95] px-6 text-[#7b4b22] hover:bg-[#fff4e6]"
            onClick={() => boardQuery.refetch()}
          >
            Làm mới
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#ead8c0] shadow-[0_18px_36px_rgba(184,130,73,0.08)]">
        <CardHeader className="pb-1">
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[180px_220px_220px_220px_minmax(0,1fr)]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Ngày làm việc</span>
            <Input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Ca làm việc</span>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_OPTIONS.map((shift) => (
                <Button
                  key={shift.code}
                  type="button"
                  variant={shiftCode === shift.code ? "default" : "outline"}
                  className={cn(
                    "rounded-full",
                    shiftCode === shift.code
                      ? "bg-[#cf5b42] text-white hover:bg-[#bf4b31]"
                      : "border-[#d9bb95] text-[#7b4b22] hover:bg-[#fff4e6]",
                  )}
                  onClick={() => setShiftCode(shift.code)}
                >
                  {shift.label}
                </Button>
              ))}
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Role</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Tìm kiếm</span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên, username hoặc staff ID..."
            />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Nhân sự trong ca", value: summary.total, tone: "text-[#5a2f17]" },
          { label: "Đã check-in", value: summary.checkedIn, tone: "text-[#44723b]" },
          { label: "Đi trễ", value: summary.late, tone: "text-[#8f5b17]" },
          { label: "Thiếu checkout", value: summary.missingCheckout, tone: "text-[#a03f3f]" },
          { label: "Vắng mặt", value: summary.absent, tone: "text-[#6d4928]" },
        ].map((item) => (
          <Card
            key={item.label}
            className="border-[#ead8c0] bg-white shadow-[0_16px_32px_rgba(184,130,73,0.08)]"
          >
            <CardContent className="p-6">
              <div className="text-sm text-[#8a684d]">{item.label}</div>
              <div className={cn("mt-3 text-4xl font-semibold tracking-tight", item.tone)}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {boardQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Không tải được board chấm công</AlertTitle>
          <AlertDescription>{boardQuery.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <Card className="border-[#ead8c0] shadow-[0_20px_40px_rgba(184,130,73,0.08)]">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-3xl text-[#5a2f17]">Board theo ca</CardTitle>
                <CardDescription>
                  {boardQuery.data?.shiftName ?? "Ca làm việc"} • {businessDate} • {items.length} nhân sự
                </CardDescription>
              </div>
              <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] px-4 py-1 text-[#7d5732]">
                {items.length} dòng
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {boardQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-10 text-center text-[#8b6a50]">
                Đang tải board chấm công...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-10 text-center text-[#8b6a50]">
                Không có nhân sự phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="max-h-[820px] space-y-4 overflow-y-auto pr-2">
                {items.map((row) => (
                  <StaffRow
                    key={row.rowKey}
                    row={row}
                    selected={row.rowKey === effectiveSelectedRowKey}
                    onSelect={() => handleSelectRow(row.rowKey)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[#ead8c0] shadow-[0_20px_40px_rgba(184,130,73,0.08)]">
            <CardHeader className="pb-4">
              <div className="text-sm uppercase tracking-[0.34em] text-[#b48b63]">Attendance Workbench</div>
              <CardTitle className="mt-3 text-3xl text-[#5a2f17]">
                {selectedRow ? selectedRow.staffName || selectedRow.username : "Chọn một nhân sự để thao tác"}
              </CardTitle>
              {selectedRow ? (
                <CardDescription>
                  @{selectedRow.username} • {getRoleLabel(selectedRow.staffRole)}
                </CardDescription>
              ) : (
                <CardDescription>
                  Chọn một dòng ở board bên trái để xem chi tiết, lịch sử và thực hiện thao tác chấm công.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedRow ? (
                <div className="rounded-2xl border border-dashed border-[#ead8c0] px-5 py-10 text-[#8b6a50]">
                  Board bên trái sẽ giữ toàn bộ trạng thái theo ngày/ca, còn panel này chỉ tập trung cho chi tiết và thao tác.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusMeta?.className)}>
                      {statusMeta?.label}
                    </Badge>
                    <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] px-3 py-1 text-[#7d5732]">
                      {getSourceLabel(selectedRow.source)}
                    </Badge>
                    {selectedRow.isOpen && (
                      <Badge className="rounded-full border-[#bad7d4] bg-[#edf9f7] px-3 py-1 text-[#2d6d66]">
                        Bản ghi đang mở
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#ead8c0] bg-[#fffaf4] p-4">
                      <div className="text-xs uppercase tracking-[0.28em] text-[#b48b63]">Khung giờ ca</div>
                      <div className="mt-2 text-lg font-semibold text-[#4e2916]">
                        {selectedRow.startTime.slice(0, 5)} → {selectedRow.endTime.slice(0, 5)}
                      </div>
                      <div className="mt-1 text-sm text-[#8a684d]">
                        Scheduled: {formatDateTime(selectedRow.scheduledStartAt)} → {formatDateTime(selectedRow.scheduledEndAt)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#ead8c0] bg-[#fffaf4] p-4">
                      <div className="text-xs uppercase tracking-[0.28em] text-[#b48b63]">Thời lượng làm việc</div>
                      <div className="mt-2 text-lg font-semibold text-[#4e2916]">
                        {formatDuration(selectedRow.workedMinutes)}
                      </div>
                      <div className="mt-1 text-sm text-[#8a684d]">
                        Check-in: {formatDateTime(selectedRow.checkInAt)} • Check-out: {formatDateTime(selectedRow.checkOutAt)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#ead8c0] p-4">
                      <div className="text-sm font-medium text-[#6f4728]">Đi muộn / về sớm</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="rounded-full border-[#f1d7a2] bg-[#fff8ea] text-[#8f5b17]">
                          Trễ: {selectedRow.lateMinutes} phút
                        </Badge>
                        <Badge className="rounded-full border-[#f4c09c] bg-[#fff0e4] text-[#b26023]">
                          Về sớm: {selectedRow.earlyLeaveMinutes} phút
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#ead8c0] p-4">
                      <div className="text-sm font-medium text-[#6f4728]">Ghi chú hiện tại</div>
                      <div className="mt-3 text-sm leading-6 text-[#6b4e36]">
                        {selectedRow.note ? (
                          <pre className="whitespace-pre-wrap font-sans">{selectedRow.note}</pre>
                        ) : (
                          "Chưa có ghi chú."
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <Card className="border-[#ead8c0] bg-[#fffdf9] shadow-none">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl text-[#5a2f17]">Thao tác manager</CardTitle>
                        <CardDescription>
                          Ghi chú là bắt buộc để giữ audit rõ ràng cho thao tác thủ công.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#6f4728]">Thời điểm thao tác</span>
                            <Input
                              type="datetime-local"
                              value={currentActionDraft.performedAt}
                              onChange={(e) => updateActionDraft({ performedAt: e.target.value })}
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#6f4728]">Ghi chú bắt buộc</span>
                            <textarea
                              value={currentActionDraft.note}
                              onChange={(e) => updateActionDraft({ note: e.target.value })}
                              rows={4}
                              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder="Ví dụ: quản lý check-in hộ vì nhân viên quên bấm trên thiết bị."
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            onClick={handleCheckIn}
                            disabled={
                              !canCheckIn ||
                              currentActionDraft.note.trim().length < 2 ||
                              !currentActionDraft.performedAt ||
                              isBusy
                            }
                            className="rounded-full bg-[#cf5b42] px-6 text-white hover:bg-[#bf4b31]"
                          >
                            {selectedRow.status === "ABSENT" ? "Check-in correction" : "Check-in thủ công"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCheckOut}
                            disabled={
                              !canCheckOut ||
                              currentActionDraft.note.trim().length < 2 ||
                              !currentActionDraft.performedAt ||
                              isBusy
                            }
                            className="rounded-full border-[#d9bb95] text-[#7b4b22] hover:bg-[#fff4e6]"
                          >
                            Check-out thủ công
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMarkAbsent}
                            disabled={
                              !canMarkAbsent || currentActionDraft.note.trim().length < 2 || isBusy
                            }
                            className="rounded-full border-[#e3b1b1] text-[#9b3e3e] hover:bg-[#fff3f3]"
                          >
                            Đánh dấu vắng
                          </Button>
                        </div>

                        {(checkInMutation.error || checkOutMutation.error || markAbsentMutation.error) && (
                          <Alert variant="destructive">
                            <AlertDescription>
                              {checkInMutation.error?.message ??
                                checkOutMutation.error?.message ??
                                markAbsentMutation.error?.message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-[#ead8c0] shadow-none">
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl text-[#5a2f17]">Lịch sử nhân sự</CardTitle>
                          <CardDescription>8 bản ghi gần nhất của nhân sự đang chọn.</CardDescription>
                        </div>
                        <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] px-3 py-1 text-[#7d5732]">
                          {historyQuery.data?.length ?? 0} bản ghi
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {historyQuery.isLoading ? (
                        <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-8 text-center text-[#8b6a50]">
                          Đang tải lịch sử chấm công...
                        </div>
                      ) : historyQuery.data && historyQuery.data.length > 0 ? (
                        <div className="space-y-3">
                          {historyQuery.data.map((item) => {
                            const meta = getStatusMeta(item.status);
                            return (
                              <div key={item.attendanceId} className="rounded-2xl border border-[#ead8c0] px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="font-medium text-[#4e2916]">
                                    {item.businessDate} • {item.shiftName}
                                  </div>
                                  <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", meta.className)}>
                                    {meta.label}
                                  </Badge>
                                </div>
                                <div className="mt-2 text-sm text-[#7b5a3d]">
                                  {formatDateTime(item.checkInAt)} / {formatDateTime(item.checkOutAt)} • {formatDuration(item.workedMinutes)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-8 text-center text-[#8b6a50]">
                          Chưa có lịch sử chấm công cho nhân sự này.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
