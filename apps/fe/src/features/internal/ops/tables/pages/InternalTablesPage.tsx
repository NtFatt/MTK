import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../../shared/auth/authStore";
import { Can } from "../../../../../shared/auth/guards";
import {
  hasAnyPermission,
  hasPermission,
  isAdminSession,
  resolveInternalBranch,
} from "../../../../../shared/auth/permissions";
import { Badge } from "../../../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../shared/ui/card";
import { Input } from "../../../../../shared/ui/input";
import { Skeleton } from "../../../../../shared/ui/skeleton";
import { subscribeRealtime, useRealtimeRoom, type EventEnvelope } from "../../../../../shared/realtime";
import { realtimeConfig } from "../../../../../shared/realtime/config";
import { useOpsTablesQuery } from "../hooks/useOpsTablesQuery";
import { useAppMutation } from "../../../../../shared/http/useAppMutation";
import { normalizeApiError } from "../../../../../shared/http/normalizeApiError";

import { openOpsSession, closeOpsSession, extractSessionKey } from "../services/opsSessionsApi";
import { apiFetch } from "../../../../../lib/apiFetch";
import { posStore } from "../../../ops/posStore";
import {
  getOrCreateOpsCartBySessionKey,
  extractCartKey,
  getOpsCart,
  normalizeOpsCartItems,
  extractCartCreatedAt,
} from "../services/opsCartsApi";

function formatElapsed(iso?: string) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const ms = Date.now() - t;
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

type LiveInfo = {
  sessionKey?: string;
  cartKey?: string;
  startedAt?: string;
  items?: { itemId: string; name?: string; qty: number; note?: string }[];
};

type TableFilter = "ALL" | "AVAILABLE" | "ACTIVE" | "ATTENTION";

function getOpsActionError(error: unknown): { message: string; correlationId?: string | null } {
  const parsed = normalizeApiError(error);
  const message =
    parsed.code === "TABLE_UNPAID_ORDER_EXISTS"
      ? "Bàn này vẫn còn đơn chưa thanh toán. Hãy thanh toán dứt điểm trước khi mở lượt mới."
      : parsed.code === "SESSION_HAS_UNPAID_ORDERS"
        ? "Không thể đóng phiên vì bàn vẫn còn đơn chưa thanh toán."
        : parsed.message || "Không thể thực hiện thao tác cho bàn này.";

  return {
    message,
    correlationId: parsed.correlationId ?? null,
  };
}

function resolveTableSignals(table: any, liveInfo: LiveInfo | undefined) {
  const status = String(table?.status ?? "").trim().toUpperCase();
  const hasSession = Boolean(
    liveInfo?.sessionKey ??
      table?.sessionKey ??
      table?.activeSessionKey ??
      table?.currentSessionKey,
  );
  const activeOrdersCount = Number(table?.activeOrdersCount ?? 0);
  const unpaidOrdersCount = Number(table?.unpaidOrdersCount ?? 0);
  const hasBlockingUnpaid = unpaidOrdersCount > 0;
  const hasItemsPreview = Boolean(table?.activeItemsPreview || table?.unpaidItemsPreview) || (liveInfo?.items?.length ?? 0) > 0;
  const isAvailable = status === "AVAILABLE" && !hasSession && activeOrdersCount <= 0 && !hasBlockingUnpaid;
  const needsAttention = activeOrdersCount > 0 || hasItemsPreview || hasBlockingUnpaid;

  return {
    status,
    hasSession,
    activeOrdersCount,
    unpaidOrdersCount,
    hasBlockingUnpaid,
    hasItemsPreview,
    isAvailable,
    needsAttention,
  };
}

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const prefixes = ["ops:", "branch:", "cashier:", "kitchen:", "inventory:"];
  for (const prefix of prefixes) {
    if (env.room.startsWith(prefix)) {
      const rest = env.room.slice(prefix.length).trim();
      if (rest) return rest;
    }
  }

  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;
  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;

  const raw = scope?.branchId ?? scope?.branch_id ?? payload?.branchId ?? payload?.branch_id;
  return raw != null && String(raw).trim() ? String(raw).trim() : null;
}

function isOpsTablesRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;

  if (env.type === "realtime.gap" && env.room.startsWith(`ops:${branchId}`)) return true;
  if (env.room.startsWith(`ops:${branchId}`)) return true;

  const branchFromEvent = extractBranchIdFromRealtime(env);
  if (branchFromEvent !== branchId) return false;

  return (
    env.type === "cart.updated" ||
    env.type === "cart.abandoned" ||
    env.type === "order.created" ||
    env.type === "order.updated" ||
    env.type === "order.status_changed" ||
    env.type === "order.status.changed" ||
    env.type === "order.statusChanged" ||
    env.type === "payment.success" ||
    env.type === "payment.updated" ||
    env.type === "payment.completed" ||
    env.type === "table.session.opened" ||
    env.type === "table.session.closed" ||
    env.type === "table.session.updated" ||
    env.type === "reservation.created" ||
    env.type === "reservation.updated" ||
    env.type === "reservation.status.changed" ||
    env.type === "reservation.status_changed"
  );
}

export function InternalTablesPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId: urlBranchId } = useParams<{ branchId: string }>();

  const effectiveBranchId = resolveInternalBranch(session, urlBranchId);

  const branchKey = Number.isFinite(Number(effectiveBranchId))
    ? Number(effectiveBranchId)
    : effectiveBranchId;

  const userBranch = session?.branchId;

  const isBranchMismatch =
    !isAdminSession(session) &&
    userBranch != null &&
    urlBranchId != null &&
    String(userBranch) !== String(urlBranchId);

  const canReadTables = hasPermission(session, "ops.tables.read");
  const cashierFallbackPath =
    effectiveBranchId && hasPermission(session, "cashier.unpaid.read")
      ? `/i/${effectiveBranchId}/cashier`
      : null;
  const kitchenFallbackPath =
    effectiveBranchId && hasPermission(session, "kitchen.queue.read")
      ? `/i/${effectiveBranchId}/kitchen`
      : null;
  const shiftFallbackPath =
    effectiveBranchId && hasAnyPermission(session, ["shifts.read", "shifts.open", "shifts.close"])
      ? `/i/${effectiveBranchId}/shifts`
      : null;
  const reservationFallbackPath =
    effectiveBranchId &&
    hasAnyPermission(session, ["reservations.confirm", "reservations.checkin"])
      ? `/i/${effectiveBranchId}/reservations`
      : null;
  const fallbackPath =
    cashierFallbackPath ??
    kitchenFallbackPath ??
    shiftFallbackPath ??
    reservationFallbackPath ??
    null;

  const enabled = !!session && !!effectiveBranchId && !isBranchMismatch && canReadTables;
  const nav = useNavigate();
  const setTable = useStore(posStore, (s) => s.setTable);
  const setPosSession = useStore(posStore, (s) => s.setSession);

  const room = effectiveBranchId
    ? `${realtimeConfig.internalOpsRoomPrefix}:${effectiveBranchId}`
    : null;
  useRealtimeRoom(
    room,
    enabled && !!room,
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId: branchKey ?? undefined,
          token: session.accessToken,
        }
      : undefined
  );

  const { data, isLoading, error, refetch, isFetching } = useOpsTablesQuery(branchKey, enabled);

  useEffect(() => {
    if (!enabled) return;

    const handler: EventListener = () => {
      void refetch();
    };

    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled || !effectiveBranchId) return;

    const branchRoomId = String(effectiveBranchId).trim();
    if (!branchRoomId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeRealtime((env) => {
      if (!isOpsTablesRealtimeEvent(env, branchRoomId)) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refetch();
      }, 80);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, effectiveBranchId, refetch]);

  const [live, setLive] = useState<Record<string, LiveInfo>>({});
  const [noSessionFor, setNoSessionFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ message: string; correlationId?: string | null } | null>(null);
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<TableFilter>("ALL");

  const loadLive = useAppMutation({
    mutationFn: async (t: { tableId: string | number; sessionKey?: string | null; cartKey?: string | null }) => {
      const sessionKey = String(t.sessionKey ?? "").trim();
      if (!sessionKey) throw new Error("NO_SESSION");

      let cartKey = String(t.cartKey ?? "").trim();

      if (!cartKey) {
        const c = await getOrCreateOpsCartBySessionKey(sessionKey);
        cartKey = extractCartKey(c);
      }

      if (!cartKey) {
        return { tableId: String(t.tableId), sessionKey, cartKey: "", startedAt: undefined, items: [] as any[] };
      }

      const cartDetail = await getOpsCart(cartKey);
      const items = normalizeOpsCartItems(cartDetail);
      const startedAt = extractCartCreatedAt(cartDetail);

     const menuRes = await apiFetch<any>(
  `/menu/items?branchId=${encodeURIComponent(String(effectiveBranchId))}&limit=500`
);

      const menuItems: any[] = Array.isArray(menuRes?.items)
        ? menuRes.items
        : Array.isArray(menuRes)
          ? menuRes
          : [];

      const nameById = new Map(
        menuItems
          .map((x) => [String(x?.id ?? x?.itemId ?? "").trim(), String(x?.name ?? "").trim()] as const)
          .filter(([id, name]) => id && name)
      );

      const itemsWithName = items.map((it) => ({
        ...it,
        name: it.name ?? nameById.get(String(it.itemId)) ?? undefined,
      }));

      return { tableId: String(t.tableId), sessionKey, cartKey, startedAt, items: itemsWithName };
    },

    onSuccess: (out) => {
      setActionError(null);
      setLive((prev) => ({
        ...prev,
        [out.tableId]: {
          sessionKey: out.sessionKey,
          cartKey: out.cartKey,
          startedAt: out.startedAt,
          items: out.items ?? [],
        },
      }));
      void refetch();
    },
  });

  const closeMut = useAppMutation({
    mutationFn: async (p: { tableId: string | number; sessionKey: string }) => {
      await closeOpsSession({ sessionKey: p.sessionKey });
      return { tableId: String(p.tableId) };
    },
    onSuccess: (out) => {
      setActionError(null);
      setLive((prev) => {
        const next = { ...prev };
        delete next[out.tableId];
        return next;
      });
      void refetch();
    },
    onError: (error) => {
      setActionError(getOpsActionError(error));
    },
  });

  async function selectTableAndGoMenu(t: any, directionId?: string) {
    if (!t?.id) return;
    setActionError(null);
    try {
      const s = await openOpsSession({ tableId: t.id, directionId });
      const sessionKey = extractSessionKey(s);
      if (!sessionKey) throw new Error("Missing sessionKey from /admin/ops/sessions/open");

      const c = await getOrCreateOpsCartBySessionKey(sessionKey);
      const cartKey = extractCartKey(c) ?? undefined;

      setTable({
        branchId: branchKey,
        tableId: String(t.id),
        tableCode: t.code,
        directionId,
      });
      setPosSession({ sessionKey, cartKey });

      if (!effectiveBranchId) {
        nav("/i/login?reason=missing_branch", { replace: true });
        return;
      }

      nav(`/i/${effectiveBranchId}/pos/menu`);
    } catch (error) {
      setActionError(getOpsActionError(error));
    }
  }

  const filteredTables = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return (data ?? []).filter((table, index) => {
      const tableIdStr = String(table.id ?? "");
      const liveInfo = tableIdStr ? live[tableIdStr] : undefined;
      const signals = resolveTableSignals(table, liveInfo);
      const code = String(table.code ?? (table.id != null ? `#${table.id}` : `#${index + 1}`));
      const area = String(table.area ?? "").toLowerCase();
      const unpaidOrderCode = String(table.unpaidOrderCode ?? "").toLowerCase();
      const unpaidItemsPreview = String(table.unpaidItemsPreview ?? "").toLowerCase();
      const activeItemsPreview = String(table.activeItemsPreview ?? "").toLowerCase();

      if (tableFilter === "AVAILABLE" && !signals.isAvailable) return false;
      if (tableFilter === "ACTIVE" && !(signals.hasSession || signals.activeOrdersCount > 0)) return false;
      if (tableFilter === "ATTENTION" && !signals.needsAttention) return false;

      if (!keyword) return true;

      return [code.toLowerCase(), signals.status.toLowerCase(), area, unpaidOrderCode, unpaidItemsPreview, activeItemsPreview]
        .filter(Boolean)
        .some((part) => part.includes(keyword));
    });
  }, [data, live, query, tableFilter]);

  const summary = useMemo(() => {
    const totals = {
      total: 0,
      available: 0,
      active: 0,
      attention: 0,
    };

    for (const table of data ?? []) {
      const tableIdStr = String(table.id ?? "");
      const liveInfo = tableIdStr ? live[tableIdStr] : undefined;
      const signals = resolveTableSignals(table, liveInfo);
      totals.total += 1;
      if (signals.isAvailable) totals.available += 1;
      if (signals.hasSession || signals.activeOrdersCount > 0) totals.active += 1;
      if (signals.needsAttention) totals.attention += 1;
    }

    return totals;
  }, [data, live]);

  if (!isBranchMismatch && !canReadTables && fallbackPath) {
    return <Navigate to={fallbackPath} replace />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {isBranchMismatch && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="ops.tables.read"
          fallback={
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">ops.tables.read</span>
            </div>
          }
        >
          {isFetching && !isLoading && (
            <div className="text-sm text-muted-foreground">Đang làm mới...</div>
          )}
          {actionError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <div>{actionError.message}</div>
              {actionError.correlationId ? (
                <div className="mt-1 text-xs opacity-80">Mã lỗi: {actionError.correlationId}</div>
              ) : null}
            </div>
          )}

          {!isLoading && !error && (data?.length ?? 0) > 0 && (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Tổng số bàn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">{summary.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Sẵn sàng đón khách</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-emerald-700">{summary.available}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Đang có phiên</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-amber-700">{summary.active}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Cần theo dõi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-blue-700">{summary.attention}</div>
                  </CardContent>
                </Card>
              </section>

              <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Tìm bàn nhanh</div>
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tìm theo mã bàn, khu vực hoặc trạng thái..."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Lọc trạng thái</div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ["ALL", "Tất cả"],
                        ["AVAILABLE", "Sẵn sàng"],
                        ["ACTIVE", "Đang phục vụ"],
                        ["ATTENTION", "Cần theo dõi"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTableFilter(value)}
                          className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition ${
                            tableFilter === value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background hover:bg-accent"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Đang hiển thị <span className="font-medium text-foreground">{filteredTables.length}</span> /{" "}
                  {summary.total} bàn
                </div>
              </section>
            </>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isLoading && (
              <>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-3">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-3">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isLoading && error && (
              <div className="col-span-full rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Không thể tải danh sách bàn.
              </div>
            )}

            {!isLoading && !error && (data?.length ?? 0) === 0 && (
              <div className="col-span-full rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                Không có dữ liệu bàn.
              </div>
            )}

            {!isLoading && !error && (data?.length ?? 0) > 0 && filteredTables.length === 0 && (
              <div className="col-span-full rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                Không có bàn nào khớp bộ lọc hiện tại.
              </div>
            )}

            {filteredTables.map((t, idx) => {
              const code = t.code ?? (t.id != null ? `#${t.id}` : `#${idx + 1}`);
              const status = t.status ?? "—";

              const tableIdStr = String(t.id ?? "");
              const liveInfo = tableIdStr && live[tableIdStr] ? live[tableIdStr] : {};
              const directionId = (t as any).directionId as string | undefined;
              const signals = resolveTableSignals(t, liveInfo);

              const sessionKeyFromRow =
                (t as any).sessionKey ?? (t as any).activeSessionKey ?? (t as any).currentSessionKey ?? null;

              const cartKeyFromRow = (t as any).cartKey ?? (t as any).activeCartKey ?? null;
              const isBlockedByUnpaid = signals.hasBlockingUnpaid && !signals.hasSession;
              const unpaidSummary = (t as any).unpaidItemsPreview ?? (t as any).activeItemsPreview ?? null;
              const statusLabel = signals.hasBlockingUnpaid ? "CHỜ THANH TOÁN" : status;
              const statusVariant = signals.hasBlockingUnpaid ? "destructive" : status === "AVAILABLE" ? "secondary" : "default";

              return (
                <Card key={String(t.id ?? code)}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-base">{code}</CardTitle>
                      {signals.hasBlockingUnpaid ? (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="destructive">Chưa thanh toán</Badge>
                          {(t as any).unpaidOrderCode ? (
                            <Badge variant="outline">{String((t as any).unpaidOrderCode)}</Badge>
                          ) : null}
                          {(t as any).unpaidOrderStatus ? (
                            <Badge variant="outline">{String((t as any).unpaidOrderStatus)}</Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                  </CardHeader>

                  <CardContent className="text-sm text-muted-foreground">
                    {t.seats != null && <div>Số ghế: {t.seats}</div>}
                    {t.area && <div>Khu: {t.area}</div>}

                    {directionId && (
                      <div>
                        Direction: <span className="font-mono">{directionId}</span>
                      </div>
                    )}

                    {liveInfo?.sessionKey && (
                      <div>
                        Session: <span className="font-mono">{liveInfo.sessionKey}</span>
                      </div>
                    )}

                    {liveInfo?.cartKey && (
                      <div>
                        Cart: <span className="font-mono">{liveInfo.cartKey}</span>
                      </div>
                    )}

                    {liveInfo?.startedAt && (
                      <div>
                        Đang ngồi:{" "}
                        <span className="font-medium text-foreground">{formatElapsed(liveInfo.startedAt) ?? "—"}</span>
                      </div>
                    )}

                    {signals.hasBlockingUnpaid ? (
                      <div className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Bàn đang bị khóa cho tới khi thanh toán xong.
                        {(t as any).unpaidOrderCode ? ` Đơn gần nhất: ${String((t as any).unpaidOrderCode)}.` : ""}
                      </div>
                    ) : null}

                    <div className="mt-2">
                      <div className="text-xs uppercase tracking-wide">Món khách gọi</div>

                      {noSessionFor === String(t.id) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Bàn chưa có phiên. Bấm <b>Gọi món</b> để mở phiên trước.
                        </div>
                      )}

                      {t.activeItemsPreview ? (
                        <div className="mt-1 text-xs opacity-80">
                          {t.activeItemsPreview}
                          {t.activeOrderStatus ? <span className="ml-2 opacity-70">({t.activeOrderStatus})</span> : null}
                        </div>
                      ) : signals.hasBlockingUnpaid && unpaidSummary ? (
                        <div className="mt-1 text-xs opacity-80">
                          {String(unpaidSummary)}
                          {(t as any).unpaidOrderStatus ? (
                            <span className="ml-2 opacity-70">({String((t as any).unpaidOrderStatus)})</span>
                          ) : null}
                        </div>
                      ) : signals.hasBlockingUnpaid ? (
                        <div className="mt-1 text-xs opacity-70">
                          Có {signals.unpaidOrdersCount} đơn chưa thanh toán.
                        </div>
                      ) : (t.activeOrdersCount ?? 0) > 0 ? (
                        <div className="mt-1 text-xs opacity-70">
                          Có {t.activeOrdersCount} đơn đang xử lý{t.activeOrderStatus ? ` (${t.activeOrderStatus})` : ""}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs opacity-70">Chưa có món (khách chưa gọi)</div>
                      )}

                      {(liveInfo?.items?.length ?? 0) > 0 && (
                        <>
                          <div className="mt-2 text-[11px] uppercase tracking-wide opacity-60">Chi tiết (ops cart)</div>
                          <ul className="mt-1 space-y-1">
                            {liveInfo.items!.slice(0, 5).map((it) => (
                              <li key={`${it.itemId}-${it.note ?? ""}`} className="flex justify-between gap-2">
                                <span className="truncate">
                                  {it.name ?? `#${it.itemId}`}
                                  {it.note ? <span className="opacity-70"> — {it.note}</span> : null}
                                </span>
                                <span className="font-mono">x{it.qty}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm"
                        onClick={() => {
                          const tid = String(t.id ?? "");
                          setNoSessionFor(null);
                          setActionError(null);

                          void loadLive
                            .mutateAsync({
                              tableId: t.id!,
                              sessionKey: sessionKeyFromRow,
                              cartKey: cartKeyFromRow,
                            })
                            .catch((e) => {
                              if (String(e?.message ?? "") === "NO_SESSION") {
                                setNoSessionFor(tid);
                                return;
                              }
                              setActionError(getOpsActionError(e));
                            });
                        }}
                        disabled={!enabled || loadLive.isPending || t.id == null}
                        type="button"
                      >
                        {loadLive.isPending ? "Đang tải..." : "Chi tiết"}
                      </button>

                      <Can perm="ops.sessions.open">
                        <button
                          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:opacity-90"
                          onClick={() => void selectTableAndGoMenu(t, directionId)}
                          disabled={!enabled || t.id == null || isBlockedByUnpaid}
                          type="button"
                        >
                          {isBlockedByUnpaid ? "Chờ thanh toán" : "Gọi món"}
                        </button>
                      </Can>

                      {sessionKeyFromRow ? (
                        <Can perm="ops.sessions.close">
                          <button
                            className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm"
                            onClick={() =>
                              void closeMut.mutateAsync({
                                tableId: t.id!,
                                sessionKey: String(sessionKeyFromRow),
                              })
                            }
                            disabled={!enabled || closeMut.isPending || t.id == null || signals.hasBlockingUnpaid}
                            type="button"
                          >
                            {signals.hasBlockingUnpaid ? "Chờ thanh toán" : closeMut.isPending ? "Đang đóng..." : "Đóng phiên"}
                          </button>
                        </Can>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </Can>
      )}
    </div>
  );
}
