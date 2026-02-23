import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";
import { useRealtimeRoom } from "../../../../shared/realtime";

import { useKitchenQueueQuery } from "../hooks/useKitchenQueueQuery";
import { useChangeOrderStatusMutation } from "../hooks/useChangeOrderStatusMutation";
import type { KitchenQueueRow } from "../services/kitchenQueueApi";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function normStatus(s: string | undefined) {
  return String(s ?? "").trim().toUpperCase();
}

function canKitchenAction(s: string) {
  const x = normStatus(s);
  // Kitchen endpoint only allows RECEIVED / READY (BE enforce)
  if (x === "NEW") return { to: "RECEIVED" as const, label: "Nhận đơn" };
  if (x === "RECEIVED" || x === "PREPARING") return { to: "READY" as const, label: "Sẵn sàng" };
  return null;
}

export function InternalKitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (s) => s.session);

  const branchParam = branchId ?? "";
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && String(userBranch) !== String(branchParam);

  const enabled = !!session && !isBranchMismatch;

  // join kitchen room (prefix "kitchen:" đã được eventRouter parse branchId)
  useRealtimeRoom(
    branchParam ? `kitchen:${branchParam}` : null,
    enabled && !!branchParam,
    session
      ? { kind: "internal", userKey: session.user?.id ? String(session.user.id) : "internal", branchId: session.branchId ?? undefined, token: session.accessToken }
      : undefined
  );

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"ALL" | "NEW" | "RECEIVED" | "PREPARING" | "READY">("ALL");

  const statuses = tab === "ALL" ? undefined : [tab];

  const { data, isLoading, isFetching, error, refetch } = useKitchenQueueQuery({
    branchId: branchParam,
    enabled,
    statuses,
    limit: 50,
  });

  const { mutateAsync, isPending } = useChangeOrderStatusMutation();

  const list = useMemo(() => {
    const raw = data ?? [];
    const qn = q.trim().toLowerCase();
    return raw.filter((r) => {
      if (!qn) return true;
      return (
        r.orderCode.toLowerCase().includes(qn) ||
        String(r.tableCode ?? "").toLowerCase().includes(qn) ||
        normStatus(r.orderStatus).includes(qn.toUpperCase())
      );
    });
  }, [data, q]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kitchen — Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chi nhánh: <span className="font-mono">{branchParam || "—"}</span>
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={!enabled || isFetching}>
          {isFetching ? "Đang tải..." : "Refresh"}
        </Button>
      </div>

      {isBranchMismatch && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="kitchen.queue.read"
          fallback={
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">kitchen.queue.read</span>
            </div>
          }
        >
          <section className="mt-6 flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm ORD… / mã bàn…" />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="flex flex-wrap gap-1">
                <TabsTrigger value="ALL">Tất cả</TabsTrigger>
                <TabsTrigger value="NEW">NEW</TabsTrigger>
                <TabsTrigger value="RECEIVED">RECEIVED</TabsTrigger>
                <TabsTrigger value="PREPARING">PREPARING</TabsTrigger>
                <TabsTrigger value="READY">READY</TabsTrigger>
              </TabsList>
            </Tabs>
          </section>

          <section className="mt-4">
            {isLoading && <div className="text-sm text-muted-foreground">Đang tải queue…</div>}

            {!isLoading && error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Không thể tải kitchen queue. <button className="underline" onClick={() => void refetch()}>Thử lại</button>
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
                            {r.createdAt ? `Created: ${r.createdAt}` : null}
                          </div>

                          {action && (
                            <Can perm="orders.status.change">
                              <div className="mt-3">
                                <Button
                                  onClick={() =>
                                    void mutateAsync({ orderCode: r.orderCode, body: { toStatus: action.to, note: null } })
                                  }
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
    </main>
  );
}