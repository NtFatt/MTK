import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";
import { qk } from "@hadilao/contracts";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { apiFetchAuthed } from "../../../../shared/http/authedFetch";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { subscribeRealtime, useRealtimeRoom, type EventEnvelope } from "../../../../shared/realtime";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { CashierOrderCard } from "../components/CashierOrderCard";
import { CashierPaymentDialog } from "../components/CashierPaymentDialog";
import { useCashierQueueQuery } from "../hooks/useCashierQueueQuery";
import { formatElapsedFrom, formatVnd, getCashierTotal, getSeatAnchor } from "../utils/cashierDisplay";

type SettleCashResponse = {
  orderCode: string;
  txnRef?: string;
  changed: boolean;
  alreadyPaid?: boolean;
};

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function normStatus(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function uuid(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getIdemKey(scope: string): string {
  try {
    const key = `idem:${scope}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const value = uuid();
    sessionStorage.setItem(key, value);
    return value;
  } catch {
    return uuid();
  }
}

function clearIdemKey(scope: string) {
  try {
    sessionStorage.removeItem(`idem:${scope}`);
  } catch {
    // noop
  }
}

function getCashierActionErrorMessage(error: unknown): string {
  const e = error as any;
  const code =
    e?.response?.data?.code ??
    e?.data?.code ??
    e?.code ??
    null;

  const messageMap: Record<string, string> = {
    FORBIDDEN: "Bạn không có quyền thanh toán đơn này.",
    ORDER_NOT_FOUND: "Không tìm thấy đơn hàng để thanh toán.",
    ORDER_NOT_PAYABLE: "Đơn hàng này không còn ở trạng thái có thể thanh toán.",
    BRANCH_SCOPE_REQUIRED: "Phiên đăng nhập hiện tại chưa có chi nhánh hợp lệ để settle cash.",
    INVALID_TOKEN: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  };

  if (code && messageMap[code]) return messageMap[code];
  return e?.response?.data?.message || e?.message || "Có lỗi xảy ra khi xác nhận thanh toán.";
}

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const prefixes = ["cashier:", "branch:", "ops:", "order:"];
  for (const prefix of prefixes) {
    if (env.room.startsWith(prefix) && prefix !== "order:") {
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

function isCashierRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;
  if (env.type === "realtime.gap" && env.room.startsWith(`cashier:${branchId}`)) return true;
  if (env.room.startsWith(`cashier:${branchId}`)) return true;

  const branchFromEvent = extractBranchIdFromRealtime(env);
  if (branchFromEvent !== branchId) return false;

  return (
    env.type === "order.created" ||
    env.type === "order.updated" ||
    env.type === "order.status_changed" ||
    env.type === "order.status.changed" ||
    env.type === "order.statusChanged" ||
    env.type === "payment.success" ||
    env.type === "payment.updated" ||
    env.type === "payment.completed"
  );
}

export function InternalCashierPage() {
  const session = useStore(authStore, (state) => state.session);
  const { branchId } = useParams<{ branchId: string }>();
  const branchParam = String(branchId ?? "").trim();

  const role = session?.role;
  const userBranch = session?.branchId;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && branchParam && String(userBranch) !== String(branchParam);

  const canRead = useMemo(() => {
    const permissions = session?.permissions ?? [];
    return permissions.includes("cashier.unpaid.read");
  }, [session?.permissions]);
  const canSettle = useMemo(() => {
    const permissions = session?.permissions ?? [];
    return permissions.includes("cashier.settle_cash");
  }, [session?.permissions]);

  const enabled = !!session && !!branchParam && !isBranchMismatch && canRead;

  useRealtimeRoom(
    branchParam ? `cashier:${branchParam}` : null,
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
  const [payingOrderCode, setPayingOrderCode] = useState<string | null>(null);

  const listKey = useMemo(() => qk.orders.cashierUnpaid({ branchId: branchParam }), [branchParam]);
  const { data, isLoading, isFetching, error, refetch } = useCashierQueueQuery({
    branchId: branchParam,
    enabled,
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
      if (!isCashierRealtimeEvent(env, branchParam)) return;

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

  const settleMutation = useAppMutation<SettleCashResponse, any, { orderCode: string }>({
    invalidateKeys: [[...listKey] as unknown as unknown[]],
    mutationFn: async ({ orderCode }) => {
      const scope = `cashier.settle:${orderCode}`;
      const idem = getIdemKey(scope);

      const response = await apiFetchAuthed<SettleCashResponse>(
        `/admin/cashier/settle-cash/${encodeURIComponent(orderCode)}`,
        {
          method: "POST",
          idempotencyKey: idem,
        },
      );

      clearIdemKey(scope);
      return response;
    },
  });

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rows = data ?? [];
    if (!keyword) return rows;

    return rows.filter((row) => {
      const itemText = (row.items ?? []).map((item) => item.itemName).join(" ").toLowerCase();
      return (
        String(row.orderCode ?? "").toLowerCase().includes(keyword) ||
        String(row.tableCode ?? "").toLowerCase().includes(keyword) ||
        String(row.voucherName ?? "").toLowerCase().includes(keyword) ||
        String(row.voucherCode ?? "").toLowerCase().includes(keyword) ||
        itemText.includes(keyword)
      );
    });
  }, [data, query]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const totalDue = rows.reduce((sum, row) => sum + getCashierTotal(row), 0);
    const openTables = new Set(
      rows
        .map((row) => row.tableCode)
        .filter((tableCode): tableCode is string => typeof tableCode === "string" && tableCode.trim().length > 0),
    ).size;
    const readyCount = rows.filter((row) => {
      const status = normStatus(row.orderStatus);
      return status === "READY" || status === "COMPLETED" || status === "RECEIVED";
    }).length;
    const longestSeated = rows
      .filter((row) => getSeatAnchor(row))
      .sort((left, right) => Date.parse(getSeatAnchor(left) ?? "") - Date.parse(getSeatAnchor(right) ?? ""))[0];

    return {
      total: rows.length,
      openTables,
      readyCount,
      totalDue,
      longestSeatLabel: formatElapsedFrom(getSeatAnchor(longestSeated ?? {})),
    };
  }, [data]);

  const activeOrder = useMemo(() => {
    if (!payingOrderCode) return null;
    return (data ?? []).find((row) => row.orderCode === payingOrderCode) ?? null;
  }, [data, payingOrderCode]);

  const mutationError = settleMutation.error as any;
  const mutationErrorMessage = mutationError ? getCashierActionErrorMessage(mutationError) : null;
  const mutationCorrelationId = mutationError?.correlationId ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
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
              Không có quyền cashier (cần <span className="font-mono">cashier.unpaid.read</span>).
            </div>
          }
        >
          <section className="rounded-[28px] border border-[#ead8c0] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5ea_100%)] px-5 py-5 shadow-[0_20px_40px_-32px_rgba(60,29,9,0.45)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.28em] text-[#9f7751]">Cashier queue</div>
                <h1 className="text-3xl font-semibold text-[#4e2916]">Thu ngân nhìn bill, thời gian ngồi và thanh toán trên một màn</h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Đơn chờ thanh toán</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#4e2916]">{stats.total}</CardContent>
                </Card>

                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Bàn đang mở</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#4e2916]">{stats.openTables}</CardContent>
                </Card>

                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Tổng phải thu</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold text-[#b13c3c]">
                    {stats.totalDue > 0 ? formatVnd(stats.totalDue) : "Chưa có"}
                  </CardContent>
                </Card>

                <Card className="border-[#ecd9bf] bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#8a684d]">Khách ngồi lâu nhất</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-semibold text-[#4e2916]">{stats.longestSeatLabel}</CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-[26px] border border-[#ead8c0] bg-card p-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tìm theo đơn, bàn, món hoặc voucher</div>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ví dụ: ORD..., A01, bò Mỹ, HOTPOT..."
                  className="h-11"
                />
              </div>

              <div className="space-y-2 xl:min-w-[240px]">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tình trạng queue</div>
                <div className="rounded-[18px] border border-[#ead8c0] bg-[#fff8ed] px-4 py-3 text-sm text-[#6d4928]">
                  {isFetching ? "Đang làm mới..." : `Đang hiển thị ${filtered.length} / ${stats.total} bill chờ`}
                  <div className="mt-1 text-xs text-[#8a684d]">
                    {stats.readyCount} bill đang ở trạng thái sẵn sàng/đã hoàn tất chờ thu ngân kết thúc.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message}
                {error.correlationId ? <span className="mt-1 block text-xs">Mã: {error.correlationId}</span> : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {!error && mutationErrorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>
                {mutationErrorMessage}
                {mutationCorrelationId ? <span className="mt-1 block text-xs">Mã: {mutationCorrelationId}</span> : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <section>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-[320px] animate-pulse rounded-[28px] border bg-card" />
                ))}
              </div>
            ) : null}

            {!isLoading && !error && filtered.length === 0 ? (
              <div className="rounded-[26px] border bg-card p-6 text-sm text-muted-foreground">
                Không có đơn nào khớp bộ lọc hiện tại.
              </div>
            ) : null}

            {!isLoading && !error && filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {filtered.map((row) => (
                  <CashierOrderCard
                    key={row.orderCode}
                    row={row}
                    pending={settleMutation.isPending}
                    canSettle={canSettle}
                    onOpen={(entry) => setPayingOrderCode(entry.orderCode)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </Can>
      )}

      <CashierPaymentDialog
        key={activeOrder?.orderCode ?? "cashier-dialog-closed"}
        order={activeOrder}
        isPending={settleMutation.isPending}
        errorMessage={mutationErrorMessage}
        correlationId={mutationCorrelationId}
        onClose={() => setPayingOrderCode(null)}
        onConfirm={(orderCode) => {
          settleMutation.mutate(
            { orderCode },
            {
              onSuccess: () => {
                setPayingOrderCode(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
