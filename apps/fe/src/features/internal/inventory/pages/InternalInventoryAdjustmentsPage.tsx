import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";

import { useInventoryAdjustmentsQuery } from "../hooks/useInventoryAdjustmentsQuery";
import type { InventoryAdjustmentRow } from "../services/inventoryApi";

import { useRealtimeRoom } from "../../../../shared/realtime/useRealtimeRoom";
import { realtimeConfig } from "../../../../shared/realtime/config";
type ModeFilter = "" | "RESTOCK" | "DEDUCT" | "SET";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function fmtDateTime(value?: string): string {
  if (!value) return "—";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return String(value);
  return new Date(ms).toLocaleString("vi-VN");
}

function fmtDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

function mergeRows(
  prev: InventoryAdjustmentRow[],
  next: InventoryAdjustmentRow[]
): InventoryAdjustmentRow[] {
  const map = new Map<string, InventoryAdjustmentRow>();

  for (const row of prev) map.set(row.auditId, row);
  for (const row of next) map.set(row.auditId, row);

  return Array.from(map.values()).sort((a, b) => {
    const aMs = new Date(a.createdAt ?? 0).getTime();
    const bMs = new Date(b.createdAt ?? 0).getTime();
    return bMs - aMs;
  });
}

type InnerProps = {
  bid: string;
  enabled: boolean;
};

function AdjustmentsInner({ bid, enabled }: InnerProps) {
  const [q, setQ] = useState("");
  const [itemIdFilter, setItemIdFilter] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState<number>(20);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [archivedPages, setArchivedPages] = useState<InventoryAdjustmentRow[][]>([]);

  useRealtimeRoom(
    bid ? `${realtimeConfig.internalInventoryRoomPrefix}:${bid}` : null,
    enabled,
  );
  const resetPaging = useCallback(() => {
    setCursor(undefined);
    setArchivedPages([]);
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useInventoryAdjustmentsQuery(
    {
      branchId: bid,
      itemId: itemIdFilter.trim() || undefined,
      actorId: actorIdFilter.trim() || undefined,
      mode: modeFilter || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      cursor,
    },
    enabled
  );

  const currentItems = useMemo(() => data?.items ?? [], [data?.items]);
  const nextCursor = data?.page.nextCursor ?? null;
  const hasMore = Boolean(data?.page.hasMore);

  const rows = useMemo(() => {
    const previous = archivedPages.flat();
    return mergeRows(previous, currentItems);
  }, [archivedPages, currentItems]);

  useEffect(() => {
    if (!enabled) return;

    const handler: EventListener = () => {
      resetPaging();
      void refetch();
    };

    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch, resetPaging]);

  const itemOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((x) => String(x.itemId ?? "").trim()).filter(Boolean))
    ).sort();
  }, [rows]);

  const actorOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((x) => String(x.actorId ?? "").trim()).filter(Boolean))
    ).sort();
  }, [rows]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((r) => {
      const itemId = String(r.itemId ?? "").toLowerCase();
      const itemName = String(r.itemName ?? "").toLowerCase();
      const actorId = String(r.actorId ?? "").toLowerCase();
      const actorName = String(r.actorName ?? "").toLowerCase();
      const actorUsername = String(r.actorUsername ?? "").toLowerCase();
      const mode = String(r.mode ?? "").toLowerCase();
      const reason = String(r.reason ?? "").toLowerCase();

      return (
        itemId.includes(qq) ||
        itemName.includes(qq) ||
        actorId.includes(qq) ||
        actorName.includes(qq) ||
        actorUsername.includes(qq) ||
        mode.includes(qq) ||
        reason.includes(qq)
      );
    });
  }, [rows, q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const increase = rows.filter((x) => (x.delta ?? 0) > 0).length;
    const decrease = rows.filter((x) => (x.delta ?? 0) < 0).length;
    const latest = rows[0]?.createdAt;

    return { total, increase, decrease, latest };
  }, [rows]);

  function resetFilters() {
    setQ("");
    setItemIdFilter("");
    setActorIdFilter("");
    setModeFilter("");
    setFrom("");
    setTo("");
    setLimit(20);
    resetPaging();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tổng records</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Lượt tăng</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.increase}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Lượt giảm</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.decrease}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bản ghi mới nhất</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {fmtDateTime(stats.latest)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label>Tìm nhanh</Label>
              <Input
                placeholder="Search item / actor / mode / reason..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Item ID</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Filter itemId..."
                  value={itemIdFilter}
                  onChange={(e) => {
                    resetPaging();
                    setItemIdFilter(e.target.value);
                  }}
                />
                {itemOptions.length > 0 && (
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value=""
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        resetPaging();
                        setItemIdFilter(value);
                      }
                    }}
                  >
                    <option value="">Chọn item đã tải...</option>
                    {itemOptions.slice(0, 20).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Actor ID</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Filter actorId..."
                  value={actorIdFilter}
                  onChange={(e) => {
                    resetPaging();
                    setActorIdFilter(e.target.value);
                  }}
                />
                {actorOptions.length > 0 && (
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value=""
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        resetPaging();
                        setActorIdFilter(value);
                      }
                    }}
                  >
                    <option value="">Chọn actor đã tải...</option>
                    {actorOptions.slice(0, 20).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={modeFilter}
                onChange={(e) => {
                  resetPaging();
                  setModeFilter(e.target.value as ModeFilter);
                }}
              >
                <option value="">Tất cả</option>
                <option value="RESTOCK">RESTOCK</option>
                <option value="DEDUCT">DEDUCT</option>
                <option value="SET">SET</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  resetPaging();
                  setFrom(e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  resetPaging();
                  setTo(e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Page size</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={String(limit)}
                onChange={(e) => {
                  resetPaging();
                  setLimit(Number(e.target.value));
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetPaging();
                void refetch();
              }}
            >
              Refresh
            </Button>

            <Button type="button" variant="secondary" onClick={resetFilters}>
              Reset filters
            </Button>

            <Badge variant="outline">Branch {bid || "—"}</Badge>
            <Badge variant="outline">Loaded {rows.length}</Badge>
            {isFetching && <Badge variant="outline">Đang tải...</Badge>}
            {hasMore && <Badge variant="outline">Còn trang tiếp</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử điều chỉnh tồn kho</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>{String(error.message ?? "Không tải được adjustment history")}</span>
                <Button type="button" variant="secondary" onClick={() => void refetch()}>
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoading && rows.length === 0 && (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Đang tải adjustment history...
            </div>
          )}

          {!isLoading && !error && list.length === 0 && (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Không có lịch sử phù hợp bộ lọc hiện tại.
            </div>
          )}

          {list.length > 0 && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-medium">Time</th>
                    <th className="px-3 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 font-medium">Mode</th>
                    <th className="px-3 py-3 font-medium">Before</th>
                    <th className="px-3 py-3 font-medium">After</th>
                    <th className="px-3 py-3 font-medium">Delta</th>
                    <th className="px-3 py-3 font-medium">Actor</th>
                    <th className="px-3 py-3 font-medium">Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {list.map((row) => (
                    <tr key={row.auditId} className="border-b align-top">
                      <td className="px-3 py-3 whitespace-nowrap">
                        {fmtDateTime(row.createdAt)}
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-mono">{row.itemId}</div>
                        <div className="text-muted-foreground">
                          {row.itemName || "—"}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <Badge variant="outline">{row.mode || "—"}</Badge>
                      </td>

                      <td className="px-3 py-3">{row.prevQty}</td>
                      <td className="px-3 py-3">{row.newQty}</td>

                      <td className="px-3 py-3">
                        <span
                          className={
                            row.delta > 0
                              ? "font-medium text-emerald-600"
                              : row.delta < 0
                                ? "font-medium text-red-600"
                                : "text-muted-foreground"
                          }
                        >
                          {fmtDelta(row.delta)}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-mono">{row.actorId || "—"}</div>
                        <div>{row.actorName || "—"}</div>
                        <div className="text-muted-foreground">
                          {row.actorUsername || "—"}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-muted-foreground">
                        {row.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!hasMore || !nextCursor || isFetching}
              onClick={() => {
                if (!nextCursor) return;
                if (currentItems.length > 0) {
                  setArchivedPages((prev) => [...prev, currentItems]);
                }
                setCursor(nextCursor);
              }}
            >
              {isFetching && rows.length > 0 ? "Đang tải..." : "Tải thêm"}
            </Button>

            <div className="text-sm text-muted-foreground">
              {hasMore
                ? "Có thể tải thêm dữ liệu."
                : rows.length > 0
                  ? "Đã tải hết dữ liệu hiện có."
                  : "Chưa có dữ liệu."}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function InternalInventoryAdjustmentsPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const role = session?.role;
  const isAdmin = isAdminRole(role);

  const urlBid = String(branchId ?? "").trim();
  const sessionBid = session?.branchId != null ? String(session.branchId) : "";
  const bid = isAdmin ? urlBid : sessionBid || urlBid;

  const shouldRedirectBranch =
    !!session && !isAdmin && !!sessionBid && !!urlBid && sessionBid !== urlBid;

  const shouldRedirectMissingBranch = !!session && !bid;

  const canAccess = useMemo(
    () => (session?.permissions ?? []).includes("inventory.adjust"),
    [session?.permissions]
  );

  const enabled =
    !!session && !!bid && canAccess && !shouldRedirectBranch && !shouldRedirectMissingBranch;

  if (shouldRedirectBranch) {
    return <Navigate to={`/i/${sessionBid}/inventory/adjustments`} replace />;
  }

  if (shouldRedirectMissingBranch) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  return (
    <Can
      perm="inventory.adjust"
      fallback={
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Không đủ quyền: <span className="font-mono">inventory.adjust</span>
        </div>
      }
    >
      <AdjustmentsInner key={bid} bid={bid} enabled={enabled} />
    </Can>
  );
}
