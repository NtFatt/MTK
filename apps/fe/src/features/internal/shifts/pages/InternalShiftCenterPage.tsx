import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { hasPermission } from "../../../../shared/auth/permissions";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { useRealtimeRoom } from "../../../../shared/realtime";
import { useCloseShiftMutation } from "../hooks/useCloseShiftMutation";
import { useCurrentShiftQuery } from "../hooks/useCurrentShiftQuery";
import { useOpenShiftMutation } from "../hooks/useOpenShiftMutation";
import { useShiftHistoryQuery } from "../hooks/useShiftHistoryQuery";
import {
  SHIFT_DENOMINATIONS,
  type CloseShiftPayload,
  type OpenShiftPayload,
  type ShiftBreakdownInput,
  type ShiftCode,
  type ShiftRunView,
} from "../services/shiftApi";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | null): string {
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

function formatVariance(value: number | null | undefined): string {
  if (value == null) return "—";
  const tone = value === 0 ? "" : value > 0 ? "+" : "-";
  return `${tone}${formatVnd(Math.abs(value))}`;
}

function buildEmptyBreakdown(): ShiftBreakdownInput[] {
  return SHIFT_DENOMINATIONS.map((denomination) => ({
    denomination,
    quantity: 0,
  }));
}

function buildGreedyBreakdown(amount: number): ShiftBreakdownInput[] {
  let remaining = Math.max(0, Math.round(amount));
  return SHIFT_DENOMINATIONS.map((denomination) => {
    const quantity = Math.floor(remaining / denomination);
    remaining -= quantity * denomination;
    return { denomination, quantity };
  });
}

function sumBreakdown(rows: ShiftBreakdownInput[]): number {
  return rows.reduce((sum, row) => sum + row.denomination * row.quantity, 0);
}

function denominationLabel(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function shiftTone(shift: Pick<ShiftRunView, "status"> | null) {
  if (!shift) return "border-[#ead8c0] bg-[#fffaf4] text-[#7a5a43]";
  if (shift.status === "OPEN") return "border-[#bad7c0] bg-[#edf8f1] text-[#25613d]";
  if (shift.status === "CLOSED") return "border-[#d3d9ef] bg-[#eff4ff] text-[#355b9c]";
  if (shift.status === "FORCE_CLOSED") return "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]";
  return "border-[#ead8c0] bg-[#fffaf4] text-[#7a5a43]";
}

function shiftDisplayLabel(code: ShiftCode) {
  return code === "MORNING" ? "Ca sáng" : "Ca chiều";
}

function BreakdownEditor({
  rows,
  onChange,
}: {
  rows: ShiftBreakdownInput[];
  onChange: (rows: ShiftBreakdownInput[]) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <label
          key={row.denomination}
          className="grid gap-3 rounded-[20px] border border-[#ead8c0] bg-[#fffdf9] px-4 py-4"
        >
          <div className="min-w-0">
            <div className="text-lg font-semibold tabular-nums leading-none text-[#4e2916]">
              {denominationLabel(row.denomination)} đ
            </div>
            <div className="mt-2 text-xs font-medium text-[#9a7650]">Thành tiền</div>
            <div className="mt-1 text-sm font-medium text-[#8a684d]">
              {formatVnd(row.denomination * row.quantity)}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#9a7650]">Số lượng</div>
            <Input
              value={String(row.quantity)}
              inputMode="numeric"
              onChange={(event) => {
                const digits = event.target.value.replace(/[^\d]/g, "");
                const quantity = digits ? Number(digits) : 0;
                onChange(
                  rows.map((item) =>
                    item.denomination === row.denomination ? { ...item, quantity } : item,
                  ),
                );
              }}
              className="h-12 w-full rounded-[14px] border-[#dfc49f] bg-white text-right text-base font-semibold tabular-nums text-[#4e2916]"
            />
          </div>
        </label>
      ))}
    </div>
  );
}

function ShiftSummaryCard({
  current,
  showCashDetails,
}: {
  current: ShiftRunView | null;
  showCashDetails: boolean;
}) {
  if (!current) {
    return (
      <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5eb_100%)] shadow-[0_18px_40px_-34px_rgba(60,29,9,0.34)]">
        <CardHeader>
          <CardTitle className="text-[#4e2916]">Trạng thái ca hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#7a5a43]">
          <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-4">
            {showCashDetails
              ? "Chi nhánh hiện chưa có ca đang mở. Mở ca trước khi cashier bắt đầu settle cash."
              : "Chi nhánh hiện chưa có ca đang mở. Hãy bắt đầu ca sáng hoặc ca chiều để chấm công và theo dõi vận hành."}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5eb_100%)] shadow-[0_18px_40px_-34px_rgba(60,29,9,0.34)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Ca đang hoạt động</div>
            <CardTitle className="mt-2 text-2xl text-[#4e2916]">{current.shiftName}</CardTitle>
            <div className="mt-2 text-sm text-[#7a5a43]">
              {current.businessDate} • {current.startTime} → {current.endTime}
            </div>
          </div>
          <Badge className={`border ${shiftTone(current)}`}>{current.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(showCashDetails
            ? [
                ["Quỹ đầu ca", formatVnd(current.openingFloat)],
                ["Tiền mặt đã thu", formatVnd(current.summary.cashSales)],
                ["Doanh thu non-cash", formatVnd(current.summary.nonCashSales)],
                ["Tiền kỳ vọng hiện tại", formatVnd(current.expectedCash)],
                ["Order đã thu", String(current.summary.paidOrderCount)],
                ["Bill chưa thanh toán", String(current.summary.unpaidCount)],
                ["Người mở ca", current.openedByName],
                ["Mở lúc", formatDateTime(current.openedAt)],
              ]
            : [
                ["Loại ca", shiftDisplayLabel(current.shiftCode)],
                ["Khung giờ", `${current.startTime} → ${current.endTime}`],
                ["Người mở ca", current.openedByName],
                ["Mở lúc", formatDateTime(current.openedAt)],
                ["Bill chưa thanh toán", String(current.summary.unpaidCount)],
                ["Trạng thái", current.status],
              ]).map(([label, value]) => (
            <div
              key={label}
              className="rounded-[18px] border border-[#ead8c0] bg-white/85 px-4 py-4"
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#9f7751]">{label}</div>
              <div className="mt-2 text-base font-semibold text-[#4e2916]">{value}</div>
            </div>
          ))}
        </div>

        {current.openingNote ? (
          <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
            Ghi chú đầu ca: <span className="font-medium text-[#5a311b]">{current.openingNote}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ShiftHistoryCard({
  items,
  showCashDetails,
}: {
  items: ShiftRunView[];
  showCashDetails: boolean;
}) {
  return (
    <Card className="overflow-hidden border-[#ead8c0] bg-white shadow-[0_18px_40px_-34px_rgba(60,29,9,0.26)]">
      <CardHeader className="border-b border-[#efe1cf]">
        <CardTitle className="text-[#4e2916]">Lịch sử ca gần đây</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[540px] overflow-y-auto p-0">
        {items.length === 0 ? (
          <div className="px-6 py-6 text-sm text-[#7a5a43]">Chưa có dữ liệu lịch sử ca.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.shiftRunId}
              className="border-b border-[#f2e7d8] px-6 py-5 last:border-b-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[#4e2916]">{item.shiftName}</div>
                  <div className="mt-1 text-sm text-[#7a5a43]">
                    {item.businessDate} • {formatDateTime(item.openedAt)}
                  </div>
                </div>
                <Badge className={`border ${shiftTone(item)}`}>{item.status}</Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[#7a5a43] sm:grid-cols-2">
                {showCashDetails ? (
                  <>
                    <div>
                      Quỹ đầu ca:{" "}
                      <span className="font-semibold text-[#4e2916]">{formatVnd(item.openingFloat)}</span>
                    </div>
                    <div>
                      Tiền kỳ vọng:{" "}
                      <span className="font-semibold text-[#4e2916]">{formatVnd(item.expectedCash)}</span>
                    </div>
                    <div>
                      Đếm cuối ca:{" "}
                      <span className="font-semibold text-[#4e2916]">
                        {item.countedCash != null ? formatVnd(item.countedCash) : "—"}
                      </span>
                    </div>
                    <div>
                      Chênh lệch:{" "}
                      <span className="font-semibold text-[#4e2916]">{formatVariance(item.variance)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      Khung giờ:{" "}
                      <span className="font-semibold text-[#4e2916]">
                        {item.startTime} → {item.endTime}
                      </span>
                    </div>
                    <div>
                      Người mở ca:{" "}
                      <span className="font-semibold text-[#4e2916]">{item.openedByName}</span>
                    </div>
                    <div>
                      Người đóng ca:{" "}
                      <span className="font-semibold text-[#4e2916]">{item.closedByName ?? "—"}</span>
                    </div>
                    <div>
                      Ghi chú:{" "}
                      <span className="font-semibold text-[#4e2916]">
                        {item.closeNote ?? item.openingNote ?? "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function InternalShiftCenterPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (state) => state.session);

  const branchParam = String(branchId ?? "").trim();
  const role = session?.role;
  const userBranch = session?.branchId;
  const isBranchMismatch =
    !isAdminRole(role) &&
    userBranch != null &&
    branchParam &&
    String(userBranch) !== String(branchParam);

  const canRead = hasPermission(session, "shifts.read");
  const canOpen = hasPermission(session, "shifts.open");
  const canClose = hasPermission(session, "shifts.close");
  const canHandleCash = hasPermission(session, "cashier.settle_cash");
  const simpleShiftMode = !canHandleCash;
  const enabled = !!session && !!branchParam && !isBranchMismatch && canRead;

  useRealtimeRoom(
    enabled ? `shift:${branchParam}` : null,
    enabled,
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId: branchParam || (session.branchId != null ? String(session.branchId) : undefined),
          token: session.accessToken,
        }
      : undefined,
  );

  const {
    data: currentData,
    error: currentError,
    isLoading: currentLoading,
    isFetching: currentFetching,
    refetch: refetchCurrent,
  } = useCurrentShiftQuery(branchParam, enabled);
  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useShiftHistoryQuery({
    branchId: branchParam,
    enabled,
    limit: 12,
  });

  const openMutation = useOpenShiftMutation(branchParam);
  const closeMutation = useCloseShiftMutation(branchParam);

  const current = currentData?.current ?? null;
  const templates = useMemo(() => currentData?.templates ?? [], [currentData?.templates]);

  const [shiftCode, setShiftCode] = useState<ShiftCode>("MORNING");
  const [businessDate, setBusinessDate] = useState(todayLocalDate());
  const [openingFloat, setOpeningFloat] = useState(0);
  const [openingBreakdown, setOpeningBreakdown] = useState<ShiftBreakdownInput[]>(() =>
    buildEmptyBreakdown(),
  );
  const [openingNote, setOpeningNote] = useState("");

  const [closeDraft, setCloseDraft] = useState<{
    scopeKey: string;
    breakdown: ShiftBreakdownInput[];
    note: string;
  }>({
    scopeKey: "",
    breakdown: buildEmptyBreakdown(),
    note: "",
  });

  const resolvedShiftCode = useMemo<ShiftCode>(() => {
    if (templates.some((item) => item.code === shiftCode)) return shiftCode;
    return templates[0]?.code ?? "MORNING";
  }, [shiftCode, templates]);

  const closeScopeKey = current
    ? `${current.shiftRunId}:${current.expectedCash}:${current.version}`
    : "";
  const effectiveCloseDraft =
    closeDraft.scopeKey === closeScopeKey
      ? closeDraft
      : {
          scopeKey: closeScopeKey,
          breakdown: current ? buildGreedyBreakdown(current.expectedCash) : buildEmptyBreakdown(),
          note: "",
        };
  const closeBreakdown = effectiveCloseDraft.breakdown;
  const closeNote = effectiveCloseDraft.note;

  const updateCloseDraft = (patch: Partial<typeof effectiveCloseDraft>) => {
    setCloseDraft((previous) => {
      const base =
        previous.scopeKey === closeScopeKey
          ? previous
          : {
              scopeKey: closeScopeKey,
              breakdown: current
                ? buildGreedyBreakdown(current.expectedCash)
                : buildEmptyBreakdown(),
              note: "",
            };
      return {
        ...base,
        ...patch,
      };
    });
  };

  const openingTotal = useMemo(() => sumBreakdown(openingBreakdown), [openingBreakdown]);
  const countedCash = useMemo(() => sumBreakdown(closeBreakdown), [closeBreakdown]);
  const variance = current ? countedCash - current.expectedCash : 0;

  const handleRefresh = () => {
    void refetchCurrent();
    void refetchHistory();
  };

  const handleOpenShift = () => {
    const payload: OpenShiftPayload = {
      businessDate,
      shiftCode: resolvedShiftCode,
      openingFloat: simpleShiftMode ? 0 : openingFloat,
      openingBreakdown: simpleShiftMode ? buildEmptyBreakdown() : openingBreakdown,
      note: openingNote.trim() || null,
    };
    openMutation.mutate(payload);
  };

  const handleCloseShift = () => {
    if (!current) return;
    const payload: CloseShiftPayload = {
      branchId: branchParam,
      countedBreakdown: simpleShiftMode ? buildEmptyBreakdown() : closeBreakdown,
      note: closeNote.trim() || null,
      expectedVersion: current.version,
    };
    closeMutation.mutate({ shiftRunId: current.shiftRunId, payload });
  };

  const simpleModeCloseBlocked =
    simpleShiftMode &&
    !!current &&
    (current.summary.unpaidCount > 0 ||
      current.summary.cashSales > 0 ||
      current.summary.nonCashSales > 0 ||
      current.expectedCash > 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {isBranchMismatch && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && !canRead ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Không có quyền shift center (cần <span className="font-mono">shifts.read</span>).
        </div>
      ) : null}

      {!isBranchMismatch && canRead ? (
        <>
          <section className="rounded-[30px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff4e8_100%)] px-6 py-6 shadow-[0_20px_40px_-32px_rgba(60,29,9,0.45)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">Shift center</div>
                <h1 className="text-3xl font-semibold text-[#4e2916]">Mở ca / kết ca chi nhánh {branchParam}</h1>
                <div className="text-sm text-[#7a5a43]">
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canHandleCash ? (
                  <Link to={`/i/${branchParam}/cashier`}>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                    >
                      Sang cashier
                    </Button>
                  </Link>
                ) : (
                  <Link to={`/i/${branchParam}/kitchen`}>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                    >
                      Sang kitchen
                    </Button>
                  </Link>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefresh}
                  className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                >
                  {currentFetching || historyLoading ? "Đang làm mới..." : "Làm mới"}
                </Button>
              </div>
            </div>
          </section>

          {currentError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {currentError.message}
                {currentError.correlationId ? (
                  <span className="mt-1 block text-xs">Mã: {currentError.correlationId}</span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {historyError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {historyError.message}
                {historyError.correlationId ? (
                  <span className="mt-1 block text-xs">Mã: {historyError.correlationId}</span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <section
            className={`grid gap-6 ${
              simpleShiftMode
                ? "xl:grid-cols-[minmax(0,1fr)_380px]"
                : "xl:grid-cols-[minmax(0,1.12fr)_420px]"
            }`}
          >
            <div className="space-y-6">
              {currentLoading ? (
                <div className="h-[320px] animate-pulse rounded-[28px] border border-[#ead8c0] bg-white/70" />
              ) : (
                <ShiftSummaryCard current={current} showCashDetails={!simpleShiftMode} />
              )}
              {!simpleShiftMode || (history?.length ?? 0) > 0 ? (
                <ShiftHistoryCard items={history ?? []} showCashDetails={!simpleShiftMode} />
              ) : null}
            </div>

            <div className="space-y-6">
              {!current ? (
                <Card className="border-[#ead8c0] bg-white shadow-[0_18px_40px_-34px_rgba(60,29,9,0.26)]">
                  <CardHeader className="space-y-3 border-b border-[#efe1cf]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Mở ca</div>
                        <CardTitle className="mt-2 text-[#4e2916]">
                          {simpleShiftMode ? "Bắt đầu ca vận hành" : "Bắt đầu ca làm việc"}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    {openMutation.error ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {openMutation.error.message}
                          {openMutation.error.correlationId ? (
                            <span className="mt-1 block text-xs">Mã: {openMutation.error.correlationId}</span>
                          ) : null}
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="space-y-4">
                      <label className="space-y-2">
                        <div className="text-sm font-medium text-[#6d4928]">
                          {simpleShiftMode ? "Ngày làm việc" : "Business date"}
                        </div>
                        <Input
                          type="date"
                          value={businessDate}
                          onChange={(event) => setBusinessDate(event.target.value)}
                        />
                      </label>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-[#6d4928]">Loại ca</div>
                        <div className="grid gap-2">
                          {templates.map((template) => {
                            const selected = resolvedShiftCode === template.code;
                            return (
                              <button
                                key={template.code}
                                type="button"
                                onClick={() => setShiftCode(template.code)}
                                className={`flex items-center justify-between gap-3 rounded-[16px] border px-4 py-3 text-left transition ${
                                  selected
                                    ? "border-[#cf5b42] bg-[#fff2ea]"
                                    : "border-[#ead8c0] bg-[#fffdf9] hover:bg-[#fff7ef]"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-lg font-semibold text-[#4e2916]">
                                    {shiftDisplayLabel(template.code)}
                                  </div>
                                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9f7751]">
                                    {simpleShiftMode ? "Ca vận hành" : "Ca thu ngân"}
                                  </div>
                                </div>
                                <div className="shrink-0 rounded-full border border-[#ead8c0] bg-white/80 px-3 py-1 text-sm text-[#7a5a43]">
                                  {template.startTime} → {template.endTime}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {simpleShiftMode ? (
                      <div >
                      </div>
                    ) : (
                      <>
                        <label className="space-y-2">
                          <div className="text-sm font-medium text-[#6d4928]">Quỹ đầu ca</div>
                          <Input
                            value={String(openingFloat)}
                            inputMode="numeric"
                            onChange={(event) => {
                              const digits = event.target.value.replace(/[^\d]/g, "");
                              setOpeningFloat(digits ? Number(digits) : 0);
                            }}
                            placeholder="500000"
                          />
                        </label>

                        <div className="rounded-[20px] border border-[#ead8c0] bg-[#fffaf4] p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#4e2916]">Breakdown đầu ca</div>
                              <div className="text-xs text-[#8a684d]">
                                Tổng breakdown: <span className="font-semibold text-[#5a311b]">{formatVnd(openingTotal)}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                              onClick={() => setOpeningBreakdown(buildGreedyBreakdown(openingFloat))}
                            >
                              Tự điền theo quỹ
                            </Button>
                          </div>
                          <BreakdownEditor rows={openingBreakdown} onChange={setOpeningBreakdown} />
                        </div>
                      </>
                    )}

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-[#6d4928]">
                        {simpleShiftMode ? "Ghi chú ca" : "Ghi chú đầu ca"}
                      </div>
                      <textarea
                        value={openingNote}
                        onChange={(event) => setOpeningNote(event.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder={
                          simpleShiftMode
                            ? "Ví dụ: bắt đầu ca sáng, đã kiểm tra line bếp và nguyên liệu đầu ca."
                            : "Ví dụ: đã kiểm tra máy in bill, két tiền, POS."
                        }
                      />
                    </label>

                    {!simpleShiftMode && openingTotal !== openingFloat ? (
                      <div className="text-sm text-[#8f2f2f]">
                        Breakdown đầu ca chưa khớp quỹ đầu ca. Hiện lệch {formatVnd(openingTotal - openingFloat)}.
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      disabled={
                        !canOpen ||
                        openMutation.isPending ||
                        (!simpleShiftMode && openingTotal !== openingFloat) ||
                        !businessDate
                      }
                      onClick={handleOpenShift}
                      className="h-12 w-full rounded-[18px] bg-[#cf5b42] text-white hover:bg-[#b94031]"
                    >
                      {openMutation.isPending
                        ? "Đang mở ca..."
                        : simpleShiftMode
                          ? "Bắt đầu ca"
                          : "Mở ca"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-[#ead8c0] bg-white shadow-[0_18px_40px_-34px_rgba(60,29,9,0.26)]">
                  <CardHeader className="space-y-3 border-b border-[#efe1cf]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">Kết ca</div>
                        <CardTitle className="mt-2 text-[#4e2916]">
                          {simpleShiftMode ? "Kết thúc ca vận hành" : current.shiftName}
                        </CardTitle>
                      </div>
                      <Badge className={`border ${shiftTone(current)}`}>{current.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-6">
                    {closeMutation.error ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {closeMutation.error.message}
                          {closeMutation.error.correlationId ? (
                            <span className="mt-1 block text-xs">Mã: {closeMutation.error.correlationId}</span>
                          ) : null}
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {simpleShiftMode ? (
                      <div className="rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
                        <div className="font-semibold text-[#4e2916]">
                          {shiftDisplayLabel(current.shiftCode)} • {current.startTime} → {current.endTime}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span>Mở bởi {current.openedByName}</span>
                          <span>Mở lúc {formatDateTime(current.openedAt)}</span>
                          <span>{current.summary.unpaidCount} bill chưa thanh toán</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-4">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9f7751]">Tiền kỳ vọng</div>
                            <div className="mt-2 text-xl font-semibold text-[#4e2916]">{formatVnd(current.expectedCash)}</div>
                          </div>
                          <div className="rounded-[18px] border border-[#ead8c0] bg-[#fffaf4] px-4 py-4">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9f7751]">Bill chưa thanh toán</div>
                            <div className="mt-2 text-xl font-semibold text-[#4e2916]">{current.summary.unpaidCount}</div>
                          </div>
                        </div>

                        <div className="rounded-[20px] border border-[#ead8c0] bg-[#fffaf4] p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#4e2916]">Breakdown kiểm đếm cuối ca</div>
                              <div className="text-xs text-[#8a684d]">
                                Tiền đếm được: <span className="font-semibold text-[#5a311b]">{formatVnd(countedCash)}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                              onClick={() =>
                                updateCloseDraft({
                                  breakdown: buildGreedyBreakdown(current.expectedCash),
                                })
                              }
                            >
                              Điền theo kỳ vọng
                            </Button>
                          </div>
                          <BreakdownEditor
                            rows={closeBreakdown}
                            onChange={(rows) => updateCloseDraft({ breakdown: rows })}
                          />
                        </div>

                        <div className="rounded-[18px] border border-[#ead8c0] bg-white/90 px-4 py-4 text-sm text-[#7a5a43]">
                          Chênh lệch hiện tại:{" "}
                          <span className="font-semibold text-[#4e2916]">{formatVariance(variance)}</span>
                        </div>
                      </>
                    )}

                    <label className="space-y-2">
                      <div className="text-sm font-medium text-[#6d4928]">Ghi chú kết ca</div>
                      <textarea
                        value={closeNote}
                        onChange={(event) => updateCloseDraft({ note: event.target.value })}
                        rows={simpleShiftMode ? 3 : 4}
                        className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder={
                          simpleShiftMode
                            ? "Ví dụ: kết thúc ca chiều, đã bàn giao line bếp và checklist cuối ca."
                            : "Bắt buộc khi có chênh lệch hoặc ghi chú bàn giao."
                        }
                      />
                    </label>

                    {current.summary.unpaidCount > 0 ? (
                      <div className="text-sm text-[#8f2f2f]">
                        Chưa thể kết ca vì chi nhánh vẫn còn {current.summary.unpaidCount} bill chưa thanh toán.
                      </div>
                    ) : null}

                    {!simpleShiftMode && variance !== 0 && !closeNote.trim() ? (
                      <div className="text-sm text-[#8f2f2f]">
                        Cần nhập ghi chú trước khi kết ca có chênh lệch.
                      </div>
                    ) : null}

                    {simpleModeCloseBlocked ? (
                      <div className="text-sm text-[#8f2f2f]">
                        Ca này đã phát sinh doanh thu hoặc vẫn còn bill mở, nên cashier hoặc quản lý sẽ là người kết ca.
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      disabled={
                        !canClose ||
                        closeMutation.isPending ||
                        current.summary.unpaidCount > 0 ||
                        (!simpleShiftMode && variance !== 0 && !closeNote.trim()) ||
                        simpleModeCloseBlocked
                      }
                      onClick={handleCloseShift}
                      className="h-12 w-full rounded-[18px] bg-[#cf5b42] text-white hover:bg-[#b94031]"
                    >
                      {closeMutation.isPending
                        ? "Đang kết ca..."
                        : simpleShiftMode
                          ? "Kết thúc ca"
                          : "Xác nhận kết ca"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!simpleShiftMode ? (
                <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5eb_100%)] shadow-[0_18px_40px_-34px_rgba(60,29,9,0.22)]">
                </Card>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
