import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";
import { subscribeRealtime, useRealtimeRoom, type EventEnvelope } from "../../../../shared/realtime";
import { KitchenOrderCard } from "../components/KitchenOrderCard";
import { useKitchenQueueQuery } from "../hooks/useKitchenQueueQuery";
import { useChangeOrderStatusMutation } from "../hooks/useChangeOrderStatusMutation";
import { type AdminOrderStatus } from "../services/adminOrderApi";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function normStatus(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function formatElapsed(iso?: string): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return `${hours}h ${remain}m`;
}

function getKitchenActionErrorMessage(error: unknown): string {
  const e = error as any;
  const code =
    e?.response?.data?.code ??
    e?.data?.code ??
    e?.code ??
    null;

  const messageMap: Record<string, string> = {
    INSUFFICIENT_INGREDIENT: "Không đủ nguyên liệu để bắt đầu chế biến",
    RECIPE_NOT_CONFIGURED: "Món chưa có công thức nguyên liệu",
    RECIPE_INGREDIENT_NOT_FOUND: "Công thức món đang tham chiếu nguyên liệu không hợp lệ",
    DUPLICATE_CONSUMPTION: "Thao tác bắt đầu chế biến đã được xử lý trước đó",
    ORDER_ITEMS_EMPTY: "Đơn hàng không có món để tiêu hao nguyên liệu",
    INVALID_TRANSITION: "Trạng thái đơn hàng không hợp lệ",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này",
  };

  if (code && messageMap[code]) return messageMap[code];

  return e?.response?.data?.message || e?.message || "Có lỗi xảy ra khi cập nhật trạng thái đơn hàng";
}

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const prefixes = ["kitchen:", "branch:", "ops:"];
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

function isKitchenRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;
  if (env.type === "realtime.gap" && env.room.startsWith(`kitchen:${branchId}`)) return true;
  if (env.room.startsWith(`kitchen:${branchId}`)) return true;

  const branchFromEvent = extractBranchIdFromRealtime(env);
  if (branchFromEvent !== branchId) return false;

  return (
    env.type === "order.created" ||
    env.type === "order.updated" ||
    env.type === "order.status_changed" ||
    env.type === "order.status.changed" ||
    env.type === "order.statusChanged"
  );
}

export function InternalKitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (state) => state.session);

  const branchParam = String(branchId ?? "").trim();
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && String(userBranch) !== String(branchParam);

  const canReadKitchen = useMemo(() => {
    const permissions = session?.permissions ?? [];
    return permissions.includes("kitchen.queue.read");
  }, [session?.permissions]);
  const canChangeStatus = useMemo(() => {
    const permissions = session?.permissions ?? [];
    return permissions.includes("orders.status.change");
  }, [session?.permissions]);

  const enabled = !!session && !isBranchMismatch && canReadKitchen;

  useRealtimeRoom(
    branchParam ? `kitchen:${branchParam}` : null,
    enabled && !!branchParam,
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId: branchParam || (session.branchId != null ? String(session.branchId) : undefined),
          token: session.accessToken,
        }
      : undefined,
  );

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"ALL" | "NEW" | "RECEIVED" | "PREPARING" | "READY">("ALL");
  const [actionError, setActionError] = useState<string | null>(null);

  const statuses = tab === "ALL" ? undefined : [tab];
  const { data, isLoading, isFetching, error, refetch } = useKitchenQueueQuery({
    branchId: branchParam,
    enabled,
    statuses,
    limit: 50,
  });

  useEffect(() => {
    if (!enabled) return;

    const handler: EventListener = () => {
      void refetch();
    };

    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled || !branchParam) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeRealtime((env) => {
      if (!isKitchenRealtimeEvent(env, branchParam)) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refetch();
      }, 80);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, branchParam, refetch]);

  const { mutateAsync, isPending } = useChangeOrderStatusMutation(branchParam);

  const handleChangeStatus = async (orderCode: string, toStatus: AdminOrderStatus) => {
    try {
      setActionError(null);
      await mutateAsync({
        orderCode,
        body: {
          toStatus,
          note: null,
        },
      });
      await refetch();
    } catch (mutationError) {
      setActionError(getKitchenActionErrorMessage(mutationError));
    }
  };

  const list = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (!keyword) return true;

      const itemText = (row.items ?? [])
        .flatMap((item) => [
          item.itemName,
          ...(item.recipe ?? []).map((recipeLine) => recipeLine.ingredientName),
        ])
        .join(" ")
        .toLowerCase();

      return (
        String(row.orderCode ?? "").toLowerCase().includes(keyword) ||
        String(row.tableCode ?? "").toLowerCase().includes(keyword) ||
        normStatus(row.orderStatus).toLowerCase().includes(keyword) ||
        itemText.includes(keyword)
      );
    });
  }, [data, query]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const newCount = rows.filter((row) => normStatus(row.orderStatus) === "NEW").length;
    const preparingCount = rows.filter((row) => normStatus(row.orderStatus) === "PREPARING").length;
    const missingRecipeCount = rows.filter((row) => row.recipeConfigured === false).length;
    const oldestWaiting = rows
      .filter((row) => {
        const status = normStatus(row.orderStatus);
        return status === "NEW" || status === "RECEIVED" || status === "PREPARING";
      })
      .sort((left, right) => Date.parse(left.createdAt ?? "") - Date.parse(right.createdAt ?? ""))[0];

    return {
      total: rows.length,
      newCount,
      preparingCount,
      missingRecipeCount,
      oldestWaitingLabel: formatElapsed(oldestWaiting?.createdAt),
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {isBranchMismatch && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {!isBranchMismatch && (
        <Can
          perm="kitchen.queue.read"
          fallback={
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">kitchen.queue.read</span>
            </div>
          }
        >
          <section className="rounded-[28px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5ea_100%)] px-5 py-5 shadow-[0_20px_40px_-32px_rgba(60,29,9,0.45)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">Kitchen queue</div>
                <h1 className="text-3xl font-semibold text-[#4e2916]">Bếp nhìn đơn, món và công thức trong một màn</h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-4">
                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Tổng ticket</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#4e2916]">{stats.total}</CardContent>
                </Card>

                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Chờ nhận</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#b26023]">{stats.newCount}</CardContent>
                </Card>

                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Đang chế biến</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#b13c3c]">{stats.preparingCount}</CardContent>
                </Card>

                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Ticket cũ nhất</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#4e2916]">{stats.oldestWaitingLabel}</CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-[26px] border border-[#ead8c0] bg-card p-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tìm theo đơn, bàn, món hoặc nguyên liệu</div>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ví dụ: ORD..., A01, bò Mỹ, nấm kim châm..."
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Lọc theo trạng thái</div>
                <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
                  <TabsList className="flex flex-wrap gap-1">
                    <TabsTrigger value="ALL">Tất cả</TabsTrigger>
                    <TabsTrigger value="NEW">NEW</TabsTrigger>
                    <TabsTrigger value="RECEIVED">RECEIVED</TabsTrigger>
                    <TabsTrigger value="PREPARING">PREPARING</TabsTrigger>
                    <TabsTrigger value="READY">READY</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="space-y-2 xl:min-w-[200px]">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tình trạng queue</div>
              <div className="rounded-[18px] border border-[#ead8c0] bg-[#fff8ed] px-4 py-3 text-sm text-[#6d4928]">
                {isFetching ? "Đang làm mới..." : `Đang hiển thị ${list.length} / ${stats.total} ticket`}
                {stats.missingRecipeCount > 0 ? (
                  <div className="mt-1 text-xs text-[#a63d3d]">
                    {stats.missingRecipeCount} ticket còn thiếu recipe ở ít nhất một món
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-[280px] animate-pulse rounded-[28px] border bg-card" />
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

            {!isLoading && !error && list.length === 0 ? (
              <div className="rounded-[26px] border bg-card p-6 text-sm text-muted-foreground">
                Không có ticket nào khớp bộ lọc hiện tại.
              </div>
            ) : null}

            {!isLoading && !error && list.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {list.map((row) => (
                  <KitchenOrderCard
                    key={row.orderCode}
                    row={row}
                    pending={isPending}
                    canChangeStatus={canChangeStatus}
                    onAdvance={handleChangeStatus}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </Can>
      )}
    </div>
  );
}
