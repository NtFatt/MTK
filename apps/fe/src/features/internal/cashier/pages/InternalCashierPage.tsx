import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { hasPermission } from "../../../../shared/auth/permissions";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { CashierKpiStrip, type CashierKpiStats } from "../components/CashierKpiStrip";
import { CashierQueueTable } from "../components/CashierQueueTable";
import {
  CashierStatusBanner,
  type CashierFlashMessage,
} from "../components/CashierStatusBanner";
import { CashierToolbar } from "../components/CashierToolbar";
import {
  CashierWorkbench,
  type CashierActionTrace,
} from "../components/CashierWorkbench";
import { useCashierQueueQuery } from "../hooks/useCashierQueueQuery";
import { useCashierRealtime } from "../hooks/useCashierRealtime";
import { useSettleCashMutation } from "../hooks/useSettleCashMutation";
import { useCurrentShiftQuery } from "../../shifts/hooks/useCurrentShiftQuery";
import type { CashierOrderRow } from "../services/cashierQueueApi";
import {
  formatDateTime,
  formatVnd,
  getCashierTotal,
  getSeatAnchor,
} from "../utils/cashierDisplay";

type AgeBucket = "all" | "lt5" | "5to15" | "gt15";
type AmountBucket = "all" | "under200" | "200to500" | "over500";

type ActionErrorState = {
  message: string;
  correlationId?: string | null;
};

const ACTION_HISTORY_KEY = "cashier:recent-actions";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function getAgeMinutes(row: CashierOrderRow): number {
  const anchor = getSeatAnchor(row);
  if (!anchor) return 0;
  const ts = Date.parse(anchor);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 60000));
}

function isOverdue(row: CashierOrderRow): boolean {
  return getAgeMinutes(row) > 15;
}

function getCashierActionErrorMessage(error: unknown): ActionErrorState {
  const e = error as any;
  const code = e?.response?.data?.code ?? e?.data?.code ?? e?.code ?? null;
  const messageMap: Record<string, string> = {
    FORBIDDEN: "Bạn không có quyền thanh toán đơn này.",
    ORDER_NOT_FOUND: "Không tìm thấy đơn hàng để thanh toán.",
    ORDER_NOT_PAYABLE: "Đơn hàng này không còn ở trạng thái có thể thanh toán.",
    BRANCH_SCOPE_REQUIRED:
      "Phiên đăng nhập hiện tại chưa có chi nhánh hợp lệ để settle cash.",
    SHIFT_NOT_OPEN: "Chi nhánh chưa mở ca. Hãy mở ca trước khi settle cash.",
    INVALID_TOKEN: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  };

  return {
    message:
      (code && messageMap[code]) ||
      e?.response?.data?.message ||
      e?.message ||
      "Có lỗi xảy ra khi xác nhận thanh toán.",
    correlationId: e?.correlationId ?? e?.response?.data?.meta?.requestId ?? null,
  };
}

function loadActionHistory(): CashierActionTrace[] {
  try {
    const raw = sessionStorage.getItem(ACTION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CashierActionTrace[]) : [];
  } catch {
    return [];
  }
}

function persistActionHistory(entries: CashierActionTrace[]) {
  try {
    sessionStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(entries.slice(0, 5)));
  } catch {
    // noop
  }
}

function buildActionTrace(entry: Omit<CashierActionTrace, "id" | "ts">): CashierActionTrace {
  return {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
  };
}

export function InternalCashierPage() {
  const session = useStore(authStore, (state) => state.session);
  const { branchId } = useParams<{ branchId: string }>();
  const branchParam = String(branchId ?? "").trim();

  const role = session?.role;
  const userBranch = session?.branchId;
  const isBranchMismatch =
    !isAdminRole(role) &&
    userBranch != null &&
    branchParam &&
    String(userBranch) !== String(branchParam);

  const canRead = hasPermission(session, "cashier.unpaid.read");
  const canSettle = hasPermission(session, "cashier.settle_cash");
  const canReadShifts = hasPermission(session, "shifts.read");
  const enabled = !!session && !!branchParam && !isBranchMismatch && canRead;

  const [query, setQuery] = useState("");
  const [ageBucket, setAgeBucket] = useState<AgeBucket>("all");
  const [amountBucket, setAmountBucket] = useState<AmountBucket>("all");
  const [onlyRecentlyUpdated, setOnlyRecentlyUpdated] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);
  const [settlingOrderCode, setSettlingOrderCode] = useState<string | null>(null);
  const [flash, setFlash] = useState<CashierFlashMessage | null>(null);
  const [actionError, setActionError] = useState<ActionErrorState | null>(null);
  const [recentActions, setRecentActions] = useState<CashierActionTrace[]>(() =>
    loadActionHistory(),
  );

  const { data, isLoading, isFetching, error, refetch } = useCashierQueueQuery({
    branchId: branchParam,
    enabled,
    limit: 80,
  });
  const {
    data: shiftData,
    error: shiftError,
    isFetching: isShiftFetching,
  } = useCurrentShiftQuery(branchParam, enabled && canReadShifts);

  useEffect(() => {
    if (!enabled) return;
    const handler: EventListener = () => {
      void refetch();
    };
    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch]);

  const {
    connectionStatus,
    lastError,
    lastSyncedAt,
    lastEventAt,
    selectedOrderStale,
    recentlyUpdatedOrderCodes,
  } = useCashierRealtime({
    branchId: branchParam,
    enabled,
    session,
    selectedOrderCode,
    refetch,
  });

  const settleMutation = useSettleCashMutation(branchParam);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 3500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const rows = useMemo(() => data ?? [], [data]);
  const currentShift = shiftData?.current ?? null;
  const settleDisabledReason = !canReadShifts
    ? null
    : shiftError
      ? "Chưa đọc được trạng thái ca. Hãy làm mới trước khi settle cash."
      : !shiftData && isShiftFetching
        ? "Đang đồng bộ trạng thái ca hiện tại..."
        : !currentShift
          ? "Chi nhánh chưa mở ca. Hãy mở ca trước khi settle cash."
          : null;
  const canCashierSettle = canSettle && !settleDisabledReason && Boolean(currentShift);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) => {
      const total = getCashierTotal(row);
      const ageMinutes = getAgeMinutes(row);
      const itemText = (row.items ?? []).map((item) => item.itemName).join(" ").toLowerCase();

      if (keyword) {
        const hit =
          String(row.orderCode ?? "").toLowerCase().includes(keyword) ||
          String(row.tableCode ?? "").toLowerCase().includes(keyword) ||
          String(row.voucherName ?? "").toLowerCase().includes(keyword) ||
          String(row.voucherCode ?? "").toLowerCase().includes(keyword) ||
          String(row.orderNote ?? "").toLowerCase().includes(keyword) ||
          itemText.includes(keyword);
        if (!hit) return false;
      }

      if (ageBucket === "lt5" && ageMinutes >= 5) return false;
      if (ageBucket === "5to15" && (ageMinutes < 5 || ageMinutes > 15)) return false;
      if (ageBucket === "gt15" && ageMinutes <= 15) return false;

      if (amountBucket === "under200" && total >= 200_000) return false;
      if (amountBucket === "200to500" && (total < 200_000 || total > 500_000)) return false;
      if (amountBucket === "over500" && total <= 500_000) return false;

      if (onlyRecentlyUpdated && !recentlyUpdatedOrderCodes.has(row.orderCode)) return false;
      if (onlyOverdue && !isOverdue(row)) return false;

      return true;
    });
  }, [
    ageBucket,
    amountBucket,
    onlyOverdue,
    onlyRecentlyUpdated,
    query,
    recentlyUpdatedOrderCodes,
    rows,
  ]);

  const stats = useMemo<CashierKpiStats>(() => {
    const unpaidValue = rows.reduce((sum, row) => sum + getCashierTotal(row), 0);
    const overdueCount = rows.filter((row) => isOverdue(row)).length;
    const recentlyUpdatedCount = rows.filter((row) => recentlyUpdatedOrderCodes.has(row.orderCode))
      .length;

    return {
      unpaidCount: rows.length,
      unpaidValue,
      overdueCount,
      recentlyUpdatedCount,
    };
  }, [recentlyUpdatedOrderCodes, rows]);

  const selectedOrder = useMemo(
    () => rows.find((row) => row.orderCode === selectedOrderCode) ?? null,
    [rows, selectedOrderCode],
  );

  const resetFilters = () => {
    setQuery("");
    setAgeBucket("all");
    setAmountBucket("all");
    setOnlyRecentlyUpdated(false);
    setOnlyOverdue(false);
  };

  const pushRecentAction = (entry: CashierActionTrace) => {
    setRecentActions((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      persistActionHistory(next);
      return next;
    });
  };

  const handleSelectOrder = (orderCode: string) => {
    setActionError(null);
    setFlash(null);
    setSelectedOrderCode(orderCode);
  };

  const handleConfirm = (orderCode: string) => {
    const current = rows.find((row) => row.orderCode === orderCode) ?? null;
    setActionError(null);
    setSettlingOrderCode(orderCode);

    settleMutation.mutate(
      { orderCode },
      {
        onSuccess: (response) => {
          const amount = current ? getCashierTotal(current) : undefined;
          const message = response.alreadyPaid
            ? `Đơn ${orderCode} đã được thanh toán trước đó.`
            : `Đã thanh toán thành công ${orderCode}.`;

          pushRecentAction(
            buildActionTrace({
              tone: "success",
              orderCode,
              message,
              amount,
              txnRef: response.txnRef ?? null,
            }),
          );

          setFlash({
            tone: response.alreadyPaid ? "warning" : "success",
            message,
          });
          setSelectedOrderCode(null);
          setSettlingOrderCode(null);
        },
        onError: (mutationError) => {
          const normalized = getCashierActionErrorMessage(mutationError);
          pushRecentAction(
            buildActionTrace({
              tone: "error",
              orderCode,
              message: normalized.message,
              amount: current ? getCashierTotal(current) : undefined,
              correlationId: normalized.correlationId ?? null,
            }),
          );

          setActionError(normalized);
          setSettlingOrderCode(null);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {isBranchMismatch && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="cashier.unpaid.read"
          fallback={
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không có quyền cashier (cần{" "}
              <span className="font-mono">cashier.unpaid.read</span>).
            </div>
          }
        >
          <CashierToolbar
            branchId={branchParam}
            operatorName={session?.user?.fullName || session?.user?.id || "Cashier"}
            connectionStatus={connectionStatus}
            lastSyncedAt={lastSyncedAt}
            lastEventAt={lastEventAt}
            isFetching={isFetching}
            onRefresh={() => void refetch()}
          />

          <CashierStatusBanner
            connectionStatus={connectionStatus}
            lastError={lastError}
            selectedOrderCode={selectedOrderCode}
            selectedOrderStale={selectedOrderStale}
            flash={flash}
          />

          {canReadShifts ? (
            <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff6ec_100%)] shadow-[0_18px_40px_-34px_rgba(60,29,9,0.22)]">
              <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">
                    Trạng thái ca hiện tại
                  </div>

                  {shiftError ? (
                    <div className="rounded-[18px] border border-[#efc4c4] bg-[#fff4f4] px-4 py-3 text-sm text-[#8f2f2f]">
                      Không tải được dữ liệu ca. {shiftError.message}
                    </div>
                  ) : currentShift ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#bad7c0] bg-[#edf8f1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#25613d]">
                          {currentShift.shiftCode}
                        </span>
                        <span className="text-lg font-semibold text-[#4e2916]">
                          {currentShift.shiftName}
                        </span>
                        <span className="text-sm text-[#7a5a43]">
                          {currentShift.businessDate}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7a5a43]">
                        <span>Mở lúc {formatDateTime(currentShift.openedAt)}</span>
                        <span>Quỹ đầu ca {formatVnd(currentShift.openingFloat)}</span>
                        <span>Tiền kỳ vọng {formatVnd(currentShift.expectedCash)}</span>
                        <span>{currentShift.summary.unpaidCount} bill chưa thanh toán</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-[#8f2f2f]">
                        Chi nhánh chưa mở ca
                      </div>
                      <div className="text-sm text-[#7a5a43]">
                        Cashier chỉ có thể settle cash sau khi một ca hợp lệ được mở cho chi
                        nhánh này.
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isShiftFetching ? (
                    <span className="text-xs text-[#8a684d]">Đang đồng bộ ca...</span>
                  ) : null}
                  <Link to={`/i/${branchParam}/shifts`}>
                    <Button
                      type="button"
                      variant={currentShift ? "outline" : "default"}
                      className={
                        currentShift
                          ? "rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                          : "rounded-full bg-[#cf5b42] text-white hover:bg-[#b94031]"
                      }
                    >
                      {currentShift ? "Vào màn hình ca làm việc" : "Mở ca ngay"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <CashierKpiStrip stats={stats} />

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message}
                {error.correlationId ? (
                  <span className="mt-1 block text-xs">Mã: {error.correlationId}</span>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
            <Card className="h-fit border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5eb_100%)] shadow-[0_18px_40px_-34px_rgba(60,29,9,0.34)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4e2916]">Bộ lọc queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#9f7751]">
                    Tìm theo mã đơn / bàn / món
                  </div>
                  <Input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && filtered.length === 1) {
                        handleSelectOrder(filtered[0].orderCode);
                      }
                    }}
                    placeholder="ORD..., A01, bò Mỹ..."
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#9f7751]">Thời gian chờ</div>
                  <div className="grid gap-2">
                    {[
                      ["all", "Tất cả"],
                      ["lt5", "< 5 phút"],
                      ["5to15", "5-15 phút"],
                      ["gt15", "> 15 phút"],
                    ].map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={ageBucket === value ? "default" : "outline"}
                        className="justify-start rounded-[16px]"
                        onClick={() => setAgeBucket(value as AgeBucket)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#9f7751]">Giá trị bill</div>
                  <div className="grid gap-2">
                    {[
                      ["all", "Tất cả"],
                      ["under200", "< 200k"],
                      ["200to500", "200k - 500k"],
                      ["over500", "> 500k"],
                    ].map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={amountBucket === value ? "default" : "outline"}
                        className="justify-start rounded-[16px]"
                        onClick={() => setAmountBucket(value as AmountBucket)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#9f7751]">Tín hiệu realtime</div>
                  <Button
                    type="button"
                    variant={onlyRecentlyUpdated ? "default" : "outline"}
                    className="w-full justify-start rounded-[16px]"
                    onClick={() => setOnlyRecentlyUpdated((prev) => !prev)}
                  >
                    Chỉ đơn vừa cập nhật
                  </Button>
                  <Button
                    type="button"
                    variant={onlyOverdue ? "default" : "outline"}
                    className="w-full justify-start rounded-[16px]"
                    onClick={() => setOnlyOverdue((prev) => !prev)}
                  >
                    Chỉ đơn quá hạn
                  </Button>
                </div>

                <div className="rounded-[18px] border border-[#ead8c0] bg-white/80 px-4 py-4 text-sm text-[#7a5a43]">
                  Đang hiển thị{" "}
                  <span className="font-semibold text-[#4e2916]">{filtered.length}</span> /{" "}
                  <span className="font-semibold text-[#4e2916]">{rows.length}</span> bill.
                  <div className="mt-1 text-xs text-[#8a684d]">
                    Tổng giá trị queue: {formatVnd(rows.reduce((sum, row) => sum + getCashierTotal(row), 0))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-[16px]"
                  onClick={resetFilters}
                >
                  Xóa toàn bộ bộ lọc
                </Button>
              </CardContent>
            </Card>

            <div className="min-w-0 space-y-5 min-[1800px]:grid min-[1800px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[1800px]:items-start">
              <div className="min-w-0 space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-[124px] animate-pulse rounded-[24px] border border-[#ead8c0] bg-white/80"
                      />
                    ))}
                  </div>
                ) : null}

                {!isLoading && !error && filtered.length === 0 ? (
                  <div className="rounded-[28px] border border-[#ead8c0] bg-white p-6 text-sm text-[#7a5a43]">
                    Không có bill nào khớp bộ lọc hiện tại.
                  </div>
                ) : null}

                {!isLoading && !error && filtered.length > 0 ? (
                  <CashierQueueTable
                    rows={filtered}
                    selectedOrderCode={selectedOrderCode}
                    settlingOrderCode={settlingOrderCode}
                    recentlyUpdatedOrderCodes={recentlyUpdatedOrderCodes}
                    onSelect={handleSelectOrder}
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                <CashierWorkbench
                  order={selectedOrder}
                  canSettle={canCashierSettle}
                  isPending={settleMutation.isPending}
                  isRefreshing={isFetching}
                  selectedOrderStale={selectedOrderStale}
                  lastSyncedAt={lastSyncedAt}
                  errorMessage={actionError?.message ?? null}
                  correlationId={actionError?.correlationId ?? null}
                  disabledReason={settleDisabledReason}
                  recentActions={recentActions}
                  onConfirm={handleConfirm}
                  onClearSelection={() => {
                    setSelectedOrderCode(null);
                    setActionError(null);
                  }}
                />
              </div>
            </div>
          </section>
        </Can>
      )}
    </div>
  );
}
