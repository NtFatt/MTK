import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";
import { useRealtimeRoom } from "../../../../shared/realtime";

import { useKitchenQueueQuery } from "../hooks/useKitchenQueueQuery";
import { useChangeOrderStatusMutation } from "../hooks/useChangeOrderStatusMutation";
import { AdminOrderStatus } from "../services/adminOrderApi";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function normStatus(s: string | undefined) {
  return String(s ?? "").trim().toUpperCase();
}

function canKitchenAction(s: string) {
  const x = normStatus(s);

  if (x === "NEW") {
    return { to: "RECEIVED" as const, label: "Nhận đơn" };
  }

  if (x === "RECEIVED") {
    return { to: "PREPARING" as const, label: "Bắt đầu chế biến" };
  }

  if (x === "PREPARING") {
    return { to: "READY" as const, label: "Sẵn sàng" };
  }

  return null;
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

export function InternalKitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (s) => s.session);

  const branchParam = String(branchId ?? "").trim();
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && String(userBranch) !== String(branchParam);

  const canReadKitchen = useMemo(() => {
    const perms = session?.permissions ?? [];
    return perms.includes("kitchen.queue.read");
  }, [session?.permissions]);

  const enabled = !!session && !isBranchMismatch && canReadKitchen;

  const realtimeAuth = session
    ? {
      kind: "internal" as const,
      userKey: session.user?.id ? String(session.user.id) : "internal",
      branchId: branchParam
        ? String(branchParam)
        : session?.branchId != null
          ? String(session.branchId)
          : undefined,
      token: session.accessToken,
    }
    : undefined;

  useRealtimeRoom(
    branchParam ? `kitchen:${branchParam}` : null,
    enabled && !!branchParam,
    realtimeAuth
  );

  const [q, setQ] = useState("");
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
    } catch (error) {
      setActionError(getKitchenActionErrorMessage(error));
    }
  };

  const list = useMemo(() => {
    const raw = data ?? [];
    const qn = q.trim().toLowerCase();
    return raw.filter((r) => {
      if (!qn) return true;
      return (
        String(r.orderCode ?? "").toLowerCase().includes(qn) ||
        String(r.tableCode ?? "").toLowerCase().includes(qn) ||
        normStatus(r.orderStatus).includes(qn.toUpperCase())
      );
    });
  }, [data, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm ORD… / mã bàn…" />
            </div>

            <div className="flex items-center gap-3">
              {isFetching && <div className="text-sm text-muted-foreground">Đang làm mới...</div>}
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="flex flex-wrap gap-1">
                  <TabsTrigger value="ALL">Tất cả</TabsTrigger>
                  <TabsTrigger value="NEW">NEW</TabsTrigger>
                  <TabsTrigger value="RECEIVED">RECEIVED</TabsTrigger>
                  <TabsTrigger value="PREPARING">PREPARING</TabsTrigger>
                  <TabsTrigger value="READY">READY</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </section>

          <section>
            {isLoading && <div className="text-sm text-muted-foreground">Đang tải queue…</div>}

            {!isLoading && error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Không thể tải kitchen queue.{" "}
                <button className="underline" onClick={() => void refetch()}>
                  Thử lại
                </button>
              </div>
            )}

            {!isLoading && !error && list.length === 0 && (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Không có dữ liệu.</div>
            )}

            {!isLoading && !error && list.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((r) => {
                  const st = normStatus(r.orderStatus);
                  const action = canKitchenAction(st);

                  return (
                    <Card key={r.orderCode} className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-mono">{r.orderCode}</CardTitle>
                        <Badge variant={st === "NEW" ? "secondary" : st === "READY" ? "outline" : "default"}>
                          {st || "UNKNOWN"}
                        </Badge>
                      </CardHeader>

                      <CardContent className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <div>
                            Bàn: <span className="font-mono">{r.tableCode ?? "—"}</span>
                          </div>

                          <div className="text-xs">
                            {r.createdAt ? `Created: ${new Date(r.createdAt).toLocaleString("vi-VN")}` : null}
                          </div>

                          {action && (
                            <Can perm="orders.status.change">
                              <div className="mt-3">
                                <Button
                                  onClick={() => void handleChangeStatus(r.orderCode, action.to)}
                                  disabled={isPending}
                                >
                                  {action.label}
                                </Button>
                              </div>
                            </Can>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </Can>
      )}
    </div>
  );
}
