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
import { Tabs, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";
import { KitchenKpiStrip, type KitchenKpiStats } from "../components/KitchenKpiStrip";
import { KitchenTicketCard } from "../components/KitchenTicketCard";
import { KitchenToolbar } from "../components/KitchenToolbar";
import {
  KitchenWorkbench,
  type KitchenActionTrace,
} from "../components/KitchenWorkbench";
import { useChangeOrderStatusMutation } from "../hooks/useChangeOrderStatusMutation";
import { useCloseShiftMutation } from "../../shifts/hooks/useCloseShiftMutation";
import { useCurrentShiftQuery } from "../../shifts/hooks/useCurrentShiftQuery";
import { useOpenShiftMutation } from "../../shifts/hooks/useOpenShiftMutation";
import {
  useKitchenFilters,
} from "../hooks/useKitchenFilters";
import { useKitchenQueueQuery } from "../hooks/useKitchenQueueQuery";
import { useKitchenRealtime } from "../hooks/useKitchenRealtime";
import type { AdminOrderStatus } from "../services/adminOrderApi";
import type { KitchenQueueRow } from "../services/kitchenQueueApi";
import {
  type KitchenActionErrorState,
  getKitchenActionErrorState,
} from "../utils/kitchenErrors";
import { formatKitchenAge, isKitchenOverdue } from "../utils/kitchenSla";
import { sortKitchenRows } from "../utils/kitchenSort";
import {
  getKitchenStatusMeta,
  normKitchenStatus,
  type KitchenStage,
} from "../utils/kitchenStatus";
import type { ShiftBreakdownInput, ShiftCode } from "../../shifts/services/shiftApi";

type KitchenActionSnapshot = {
  ticketKey: string;
  orderCode: string;
  updatedAt: string | null;
  orderStatus: string;
};

const ACTION_HISTORY_KEY = "kitchen:recent-actions";
const BOARD_STAGES: KitchenStage[] = ["NEW", "RECEIVED", "PREPARING", "READY"];

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function loadActionHistory(): KitchenActionTrace[] {
  try {
    const raw = sessionStorage.getItem(ACTION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KitchenActionTrace[]) : [];
  } catch {
    return [];
  }
}

function persistActionHistory(entries: KitchenActionTrace[]) {
  try {
    sessionStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(entries.slice(0, 6)));
  } catch {
    // ignore storage errors
  }
}

function buildActionTrace(entry: Omit<KitchenActionTrace, "id" | "ts">): KitchenActionTrace {
  return {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: new Date().toISOString(),
  };
}

function matchesKitchenQuery(row: KitchenQueueRow, keyword: string): boolean {
  if (!keyword) return true;
  const lowered = keyword.trim().toLowerCase();
  if (!lowered) return true;

  const itemText = (row.items ?? [])
    .flatMap((item) => [
      item.itemName,
      ...item.recipe.map((recipeLine) => recipeLine.ingredientName),
    ])
    .join(" ")
    .toLowerCase();

  return (
    String(row.orderCode ?? "").toLowerCase().includes(lowered) ||
    String(row.tableCode ?? "").toLowerCase().includes(lowered) ||
    normKitchenStatus(row.orderStatus).toLowerCase().includes(lowered) ||
    String(row.orderNote ?? "").toLowerCase().includes(lowered) ||
    itemText.includes(lowered)
  );
}

function buildSnapshot(row: KitchenQueueRow | null): KitchenActionSnapshot | null {
  if (!row) return null;
  return {
    ticketKey: String(row.ticketKey ?? row.orderCode),
    orderCode: row.orderCode,
    updatedAt: row.updatedAt ?? null,
    orderStatus: normKitchenStatus(row.orderStatus),
  };
}

function formatActionTimestamp(value?: string | null): string {
  if (!value) return "Không rõ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Không rõ";
  return new Date(ts).toLocaleString("vi-VN");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Không rõ";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Không rõ";
  return new Date(ts).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function buildEmptyShiftBreakdown(): ShiftBreakdownInput[] {
  return [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000].map(
    (denomination) => ({
      denomination,
      quantity: 0,
    }),
  );
}

function shiftDisplayLabel(code: ShiftCode) {
  return code === "MORNING" ? "Ca sáng" : "Ca chiều";
}

export function InternalKitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (state) => state.session);

  const branchParam = String(branchId ?? "").trim();
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && String(userBranch) !== String(branchParam);

  const canReadKitchen = hasPermission(session, "kitchen.queue.read");
  const canChangeStatus = hasPermission(session, "orders.status.change");
  const canReadShifts = hasPermission(session, "shifts.read");
  const canOpenShifts = hasPermission(session, "shifts.open");
  const canCloseShifts = hasPermission(session, "shifts.close");
  const enabled = !!session && !!branchParam && !isBranchMismatch && canReadKitchen;

  const {
    query,
    stage,
    viewMode,
    density,
    onlyOverdue,
    onlyMissingRecipe,
    setQuery,
    setStage,
    setViewMode,
    setDensity,
    toggleOnlyOverdue,
    toggleOnlyMissingRecipe,
    resetFilters,
  } = useKitchenFilters();

  const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<KitchenActionSnapshot | null>(null);
  const [pendingByTicketKey, setPendingByTicketKey] = useState<
    Record<string, AdminOrderStatus | undefined>
  >({});
  const [actionError, setActionError] = useState<KitchenActionErrorState | null>(null);
  const [recentActions, setRecentActions] = useState<KitchenActionTrace[]>(() =>
    loadActionHistory(),
  );
  const [flashMessage, setFlashMessage] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useKitchenQueueQuery({
    branchId: branchParam,
    enabled,
    limit: 120,
  });
  const {
    data: shiftData,
    error: shiftError,
    isFetching: isShiftFetching,
  } = useCurrentShiftQuery(branchParam, enabled && canReadShifts);
  const openShiftMutation = useOpenShiftMutation(branchParam);
  const closeShiftMutation = useCloseShiftMutation(branchParam);

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
    recentlyUpdatedOrderCodes,
  } = useKitchenRealtime({
    branchId: branchParam,
    enabled,
    session,
    refetch,
  });

  useEffect(() => {
    if (!flashMessage) return;
    const timer = window.setTimeout(() => setFlashMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  const { mutateAsync } = useChangeOrderStatusMutation(branchParam);

  const allRows = useMemo(() => sortKitchenRows(data ?? []), [data]);
  const currentShift = shiftData?.current ?? null;
  const shiftTemplates = shiftData?.templates?.length
    ? shiftData.templates
    : [
        {
          code: "MORNING" as const,
          name: "Ca sáng",
          startTime: "06:00",
          endTime: "14:00",
          crossesMidnight: false,
        },
        {
          code: "EVENING" as const,
          name: "Ca chiều",
          startTime: "14:00",
          endTime: "22:00",
          crossesMidnight: false,
        },
      ];
  const kitchenShiftCloseBlocked =
    !!currentShift &&
    (currentShift.summary.unpaidCount > 0 ||
      currentShift.summary.cashSales > 0 ||
      currentShift.summary.nonCashSales > 0 ||
      currentShift.expectedCash > 0);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (stage !== "ALL" && normKitchenStatus(row.orderStatus) !== stage) return false;
      if (onlyOverdue && !isKitchenOverdue(row)) return false;
      if (onlyMissingRecipe && row.recipeConfigured !== false) return false;
      if (!matchesKitchenQuery(row, query)) return false;
      return true;
    });
  }, [allRows, onlyMissingRecipe, onlyOverdue, query, stage]);

  const rowsByStage = useMemo(() => {
    const grouped: Record<string, KitchenQueueRow[]> = {
      NEW: [],
      RECEIVED: [],
      PREPARING: [],
      READY: [],
    };

    for (const row of filteredRows) {
      const key = normKitchenStatus(row.orderStatus);
      if (key in grouped) grouped[key].push(row);
    }

    return grouped;
  }, [filteredRows]);

  const stats = useMemo<KitchenKpiStats>(() => {
    const rows = allRows;
    const newCount = rows.filter((row) => normKitchenStatus(row.orderStatus) === "NEW").length;
    const receivedCount = rows.filter((row) => normKitchenStatus(row.orderStatus) === "RECEIVED").length;
    const preparingCount = rows.filter((row) => normKitchenStatus(row.orderStatus) === "PREPARING").length;
    const readyCount = rows.filter((row) => normKitchenStatus(row.orderStatus) === "READY").length;
    const overdueCount = rows.filter((row) => isKitchenOverdue(row)).length;
    const missingRecipeCount = rows.filter((row) => row.recipeConfigured === false).length;
    const oldestWaiting = rows
      .filter((row) => ["NEW", "RECEIVED", "PREPARING"].includes(normKitchenStatus(row.orderStatus)))
      .sort((left, right) => {
        return (
          Date.parse(left.createdAt ?? left.updatedAt ?? "") -
          Date.parse(right.createdAt ?? right.updatedAt ?? "")
        );
      })[0];

    return {
      total: rows.length,
      newCount,
      receivedCount,
      preparingCount,
      readyCount,
      overdueCount,
      missingRecipeCount,
      oldestWaitingLabel: oldestWaiting ? formatKitchenAge(oldestWaiting) : "—",
    };
  }, [allRows]);

  const selectedOrder = useMemo(
    () => allRows.find((row) => String(row.ticketKey ?? row.orderCode) === selectedTicketKey) ?? null,
    [allRows, selectedTicketKey],
  );

  const selectedOrderStale = useMemo(() => {
    if (!selectedOrder || !selectedSnapshot) return false;
    return (
      selectedSnapshot.ticketKey === String(selectedOrder.ticketKey ?? selectedOrder.orderCode) &&
      (selectedSnapshot.updatedAt !== (selectedOrder.updatedAt ?? null) ||
        selectedSnapshot.orderStatus !== normKitchenStatus(selectedOrder.orderStatus))
    );
  }, [selectedOrder, selectedSnapshot]);

  useEffect(() => {
    if (!selectedTicketKey) return;
    const exists = allRows.some((row) => String(row.ticketKey ?? row.orderCode) === selectedTicketKey);
    if (!exists) {
      setSelectedTicketKey(null);
      setSelectedSnapshot(null);
    }
  }, [allRows, selectedTicketKey]);

  const pushRecentAction = (entry: KitchenActionTrace) => {
    setRecentActions((prev) => {
      const next = [entry, ...prev].slice(0, 6);
      persistActionHistory(next);
      return next;
    });
  };

  const handleKitchenShiftOpen = (shiftCode: ShiftCode) => {
    openShiftMutation.mutate({
      businessDate: todayLocalDate(),
      shiftCode,
      openingFloat: 0,
      openingBreakdown: buildEmptyShiftBreakdown(),
      note: `Kitchen ${shiftDisplayLabel(shiftCode).toLowerCase()}`,
    });
  };

  const handleKitchenShiftClose = () => {
    if (!currentShift) return;
    closeShiftMutation.mutate({
      shiftRunId: currentShift.shiftRunId,
      payload: {
        branchId: branchParam,
        countedBreakdown: buildEmptyShiftBreakdown(),
        note: "Kitchen operational close",
        expectedVersion: currentShift.version,
      },
    });
  };

  const handleSelectOrder = (ticketKey: string) => {
    const row = allRows.find((item) => String(item.ticketKey ?? item.orderCode) === ticketKey) ?? null;
    setActionError(null);
    setFlashMessage(null);
    setSelectedTicketKey(ticketKey);
    setSelectedSnapshot(buildSnapshot(row));
  };

  const handleAdvance = async (row: KitchenQueueRow, toStatus: AdminOrderStatus) => {
    const ticketKey = String(row.ticketKey ?? row.orderCode);
    if (pendingByTicketKey[ticketKey]) return;

    setActionError(null);
    setPendingByTicketKey((prev) => ({ ...prev, [ticketKey]: toStatus }));

    try {
      await mutateAsync({
        orderCode: row.orderCode,
        body: {
          toStatus,
          note: null,
          kitchenStatusScope: normKitchenStatus(row.orderStatus) as "NEW" | "RECEIVED" | "PREPARING",
        },
      });

      pushRecentAction(
        buildActionTrace({
          tone: "success",
          orderCode: row.orderCode,
          message: `Đã chuyển ticket sang ${toStatus}.`,
        }),
      );
      setFlashMessage({
        tone: "success",
        message: `Ticket ${row.orderCode} đã chuyển sang ${toStatus}.`,
      });
      setSelectedTicketKey(null);
      setSelectedSnapshot(null);
      await refetch();
    } catch (mutationError) {
      const normalized = getKitchenActionErrorState(mutationError);
      setActionError(normalized);
      pushRecentAction(
        buildActionTrace({
          tone: "error",
          orderCode: row.orderCode,
          message: normalized.message,
          correlationId: normalized.correlationId ?? null,
        }),
      );
    } finally {
      setPendingByTicketKey((prev) => {
        const next = { ...prev };
        delete next[ticketKey];
        return next;
      });
    }
  };

  const effectiveLastSyncedAt =
    lastSyncedAt ?? (dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null);

  return (
    <div className="mx-auto max-w-[1780px] space-y-6">
      {isBranchMismatch && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="kitchen.queue.read"
          fallback={
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">kitchen.queue.read</span>
            </div>
          }
        >
          <KitchenToolbar
            branchId={branchParam}
            connectionStatus={connectionStatus}
            lastSyncedAt={effectiveLastSyncedAt}
            lastEventAt={lastEventAt}
            isFetching={isFetching}
            viewMode={viewMode}
            density={density}
            onRefresh={() => void refetch()}
            onViewModeChange={setViewMode}
            onDensityChange={setDensity}
          />

          {flashMessage ? (
            <Alert
              className={
                flashMessage.tone === "success"
                  ? "border-[#b4dec4] bg-[#edf8f1] text-[#1c7c44]"
                  : "border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]"
              }
            >
              <AlertDescription>{flashMessage.message}</AlertDescription>
            </Alert>
          ) : null}

          {lastError && connectionStatus !== "CONNECTED" ? (
            <Alert className="border-[#ead1a9] bg-[#fff6e7] text-[#8b5a1d]">
              <AlertDescription>
                Realtime đang suy giảm: {lastError}. Queue vẫn có polling fallback mỗi 5 giây.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff6ec_100%)] shadow-[0_18px_40px_-34px_rgba(60,29,9,0.22)]">
            <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.26em] text-[#9f7751]">
                  Trạng thái ca hiện tại
                </div>

                {!canReadShifts ? (
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-[#4e2916]">Ca sáng / Ca chiều</div>
                    <div className="text-sm text-[#7a5a43]">
                      Tài khoản hiện tại chưa đọc được trạng thái ca. Hãy vào màn ca làm việc hoặc đăng nhập lại để đồng bộ quyền mới.
                    </div>
                  </div>
                ) : shiftError ? (
                  <div className="rounded-[18px] border border-[#efc4c4] bg-[#fff4f4] px-4 py-3 text-sm text-[#8f2f2f]">
                    Không tải được dữ liệu ca. {shiftError.message}
                  </div>
                ) : currentShift ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#bad7c0] bg-[#edf8f1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#25613d]">
                        {shiftDisplayLabel(currentShift.shiftCode)}
                      </span>
                      <span className="text-lg font-semibold text-[#4e2916]">
                        {currentShift.shiftName}
                      </span>
                      <span className="text-sm text-[#7a5a43]">
                        {currentShift.businessDate}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#7a5a43]">
                      <span>
                        Khung giờ {currentShift.startTime} → {currentShift.endTime}
                      </span>
                      <span>Mở bởi {currentShift.openedByName}</span>
                      <span>Mở lúc {formatDateTime(currentShift.openedAt)}</span>
                      <span>{currentShift.summary.unpaidCount} bill chưa thanh toán</span>
                    </div>
                    {kitchenShiftCloseBlocked ? (
                      <div className="text-sm text-[#8f2f2f]">
                        Ca này đã dính bill mở hoặc doanh thu, nên cashier hoặc quản lý sẽ là người kết ca.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-[#8f2f2f]">Chi nhánh chưa mở ca</div>
                    <div className="text-sm text-[#7a5a43]">
                      Mở nhanh ca sáng hoặc ca chiều để chấm công và đồng bộ vận hành trong chi nhánh.
                    </div>
                  </div>
                )}

                {openShiftMutation.error ? (
                  <div className="rounded-[16px] border border-[#efc4c4] bg-[#fff4f4] px-4 py-3 text-sm text-[#8f2f2f]">
                    {openShiftMutation.error.message}
                  </div>
                ) : null}

                {closeShiftMutation.error ? (
                  <div className="rounded-[16px] border border-[#efc4c4] bg-[#fff4f4] px-4 py-3 text-sm text-[#8f2f2f]">
                    {closeShiftMutation.error.message}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canReadShifts && isShiftFetching ? (
                  <span className="text-xs text-[#8a684d]">Đang đồng bộ ca...</span>
                ) : null}
                {canReadShifts && !currentShift ? (
                  <>
                    {shiftTemplates.map((template) => (
                      <Button
                        key={template.code}
                        type="button"
                        disabled={!canOpenShifts || openShiftMutation.isPending}
                        onClick={() => handleKitchenShiftOpen(template.code)}
                        className="rounded-full bg-[#cf5b42] text-white hover:bg-[#b94031]"
                      >
                        {openShiftMutation.isPending
                          ? "Đang mở ca..."
                          : `Mở ${shiftDisplayLabel(template.code)}`}
                      </Button>
                    ))}
                  </>
                ) : null}

                {canReadShifts && currentShift ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canCloseShifts || closeShiftMutation.isPending || kitchenShiftCloseBlocked}
                    onClick={handleKitchenShiftClose}
                    className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                  >
                    {closeShiftMutation.isPending ? "Đang kết ca..." : "Kết thúc ca"}
                  </Button>
                ) : null}

                <Link to={`/i/${branchParam}/shifts`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                  >
                    Vào màn hình ca làm việc
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <KitchenKpiStrip stats={stats} />

          <section className="grid gap-6 min-[1500px]:grid-cols-[minmax(0,1.28fr)_minmax(430px,0.92fr)]">
            <div className="min-w-0 space-y-4">
              {isLoading ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-[220px] animate-pulse rounded-[28px] border border-[#ead8c0] bg-white/80"
                    />
                  ))}
                </div>
              ) : null}

              {!isLoading && error ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Không thể tải kitchen queue.{" "}
                  <button className="underline" onClick={() => void refetch()}>
                    Thử lại
                  </button>
                </div>
              ) : null}

              {!isLoading && !error ? (
                <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f1_100%)] shadow-[0_20px_40px_-32px_rgba(60,29,9,0.32)]">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-2xl text-[#4e2916]">
                          {viewMode === "board" ? "Queue theo cột xử lý" : "Danh sách ticket"}
                        </CardTitle>
                        <div className="text-sm text-[#7a5a43]">
                          Chọn ticket ở đây, thao tác trạng thái ở workbench.
                        </div>
                      </div>
                      <div className="rounded-full border border-[#ead8c0] bg-white/85 px-4 py-2 text-sm text-[#7a5a43]">
                        {filteredRows.length} / {allRows.length} ticket
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tìm theo mã đơn, bàn, món, note..."
                        className="h-11 border-[#dfc49f] bg-[#fffdfa]"
                      />

                      <Tabs value={stage} onValueChange={(value) => setStage(value as KitchenStage)}>
                        <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-[#fff6ea] p-1">
                          <TabsTrigger value="ALL" className="flex-1 min-w-[76px]">
                            Tất cả
                          </TabsTrigger>
                          <TabsTrigger value="NEW" className="flex-1 min-w-[76px]">
                            NEW
                          </TabsTrigger>
                          <TabsTrigger value="RECEIVED" className="flex-1 min-w-[76px]">
                            RECEIVED
                          </TabsTrigger>
                          <TabsTrigger value="PREPARING" className="flex-1 min-w-[76px]">
                            PREPARING
                          </TabsTrigger>
                          <TabsTrigger value="READY" className="flex-1 min-w-[76px]">
                            READY
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleOnlyOverdue}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          onlyOverdue
                            ? "border-[#c74632] bg-[#fff0eb] text-[#8f2d1f]"
                            : "border-[#ead8c0] bg-[#fffaf3] text-[#6d4928] hover:bg-[#fff4e6]"
                        }`}
                      >
                        Quá SLA
                      </button>
                      <button
                        type="button"
                        onClick={toggleOnlyMissingRecipe}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          onlyMissingRecipe
                            ? "border-[#c74632] bg-[#fff0eb] text-[#8f2d1f]"
                            : "border-[#ead8c0] bg-[#fffaf3] text-[#6d4928] hover:bg-[#fff4e6]"
                        }`}
                      >
                        Thiếu recipe
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetFilters}
                        className="rounded-full border-[#d9bd95] bg-white/80 text-[#6a3b20]"
                      >
                        Reset
                      </Button>

                      <div className="ml-auto rounded-full border border-[#ead8c0] bg-[#fffaf3] px-4 py-2 text-sm text-[#7a5a43]">
                        {stats.missingRecipeCount > 0
                          ? `${stats.missingRecipeCount} ticket thiếu recipe`
                          : "Không có ticket thiếu recipe"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {filteredRows.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-6 py-10 text-center text-sm text-[#7a5a43]">
                        Không có ticket nào khớp bộ lọc hiện tại.
                      </div>
                    ) : viewMode === "board" ? (
                      <div className="overflow-x-auto pb-1">
                        <div className="grid min-w-[940px] grid-cols-4 gap-3">
                          {BOARD_STAGES.map((stageKey) => {
                            const statusMeta = getKitchenStatusMeta(stageKey);
                            const rows = rowsByStage[stageKey] ?? [];

                            return (
                              <div
                                key={stageKey}
                                className={`rounded-[22px] border p-3 ${statusMeta.columnClassName}`}
                              >
                                <div className="mb-3 flex items-center justify-between gap-3 rounded-[18px] bg-white/70 px-3 py-3">
                                  <div className="space-y-1">
                                    <div className="text-xs uppercase tracking-[0.22em] text-[#9f7751]">
                                      {stageKey}
                                    </div>
                                    <div className="text-base font-semibold text-[#4e2916]">
                                      {statusMeta.label}
                                    </div>
                                  </div>
                                  <div className="rounded-full border border-[#ead8c0] bg-white px-3 py-1 text-sm font-semibold text-[#5a311b]">
                                    {rows.length}
                                  </div>
                                </div>

                                <div className="max-h-[calc(100vh-460px)] space-y-3 overflow-y-auto pr-1">
                                  {rows.length > 0 ? (
                                    rows.map((row) => (
                                      <KitchenTicketCard
                                        key={String(row.ticketKey ?? row.orderCode)}
                                        row={row}
                                        density={density}
                                        selected={selectedTicketKey === String(row.ticketKey ?? row.orderCode)}
                                        recentlyUpdated={recentlyUpdatedOrderCodes.has(row.orderCode)}
                                        pendingStatus={pendingByTicketKey[String(row.ticketKey ?? row.orderCode)]}
                                        onSelect={handleSelectOrder}
                                      />
                                    ))
                                  ) : (
                                    <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-white/75 px-4 py-6 text-center text-sm text-[#8a684d]">
                                      Không có ticket trong cột này.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-[calc(100vh-380px)] space-y-3 overflow-y-auto pr-1">
                        {filteredRows.map((row) => (
                          <KitchenTicketCard
                            key={String(row.ticketKey ?? row.orderCode)}
                            row={row}
                            density={density}
                            selected={selectedTicketKey === String(row.ticketKey ?? row.orderCode)}
                            recentlyUpdated={recentlyUpdatedOrderCodes.has(row.orderCode)}
                            pendingStatus={pendingByTicketKey[String(row.ticketKey ?? row.orderCode)]}
                            onSelect={handleSelectOrder}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <KitchenWorkbench
              row={selectedOrder}
              canChangeStatus={canChangeStatus}
              isRefreshing={isFetching}
              selectedOrderStale={selectedOrderStale}
              pendingStatus={selectedTicketKey ? pendingByTicketKey[selectedTicketKey] : undefined}
              actionError={actionError}
              onAdvance={handleAdvance}
              onAcknowledgeStale={() => setSelectedSnapshot(buildSnapshot(selectedOrder))}
              onClearSelection={() => {
                setSelectedTicketKey(null);
                setSelectedSnapshot(null);
                setActionError(null);
              }}
            />
          </section>

          <Card className="border-[#ead8c0] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f1_100%)] shadow-[0_20px_40px_-32px_rgba(60,29,9,0.24)]">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#9f7751]">
                    Nhật ký thao tác
                  </div>
                  <CardTitle className="text-xl text-[#4e2916]">Lịch sử gần đây</CardTitle>
                  <div className="text-sm text-[#7a5a43]">
                    Khu riêng để tra lại thay đổi sau khi xử lý ticket. Workbench bên trên giờ chỉ tập trung cho thao tác.
                  </div>
                </div>
                <div className="rounded-full border border-[#ead8c0] bg-white/85 px-4 py-2 text-sm text-[#7a5a43]">
                  {recentActions.length} sự kiện gần nhất
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recentActions.length > 0 ? (
                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {recentActions.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[16px] border px-4 py-3 text-sm ${
                        entry.tone === "success"
                          ? "border-[#b4dec4] bg-[#edf8f1] text-[#1c7c44]"
                          : "border-[#efc4c4] bg-[#fff4f4] text-[#8f2f2f]"
                      }`}
                    >
                      <div className="font-medium">{entry.message}</div>
                      <div className="mt-1 text-xs opacity-80">
                        {entry.orderCode} • {formatActionTimestamp(entry.ts)}
                      </div>
                      {entry.correlationId ? (
                        <div className="mt-1 text-[11px] opacity-80">
                          Mã yêu cầu: {entry.correlationId}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#e2c7a3] bg-[#fffaf4] px-4 py-4 text-sm text-[#7a5a43]">
                  Chưa có thao tác bếp nào trong phiên làm việc này.
                </div>
              )}
            </CardContent>
          </Card>
        </Can>
      )}
    </div>
  );
}
