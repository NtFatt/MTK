import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Badge } from "../../../../shared/ui/badge";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Label } from "../../../../shared/ui/label";

import { useInventoryHoldsQuery } from "../hooks/useInventoryHoldsQuery";

type ExpireFilter = "ALL" | "EXPIRING_SOON" | "ACTIVE" | "EXPIRED";
type SortKey = "EXPIRE_ASC" | "EXPIRE_DESC" | "QTY_DESC" | "QTY_ASC";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function InternalInventoryHoldsPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const bid = String(branchId ?? "").trim();
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && bid && String(userBranch) !== String(bid);

  const canRead = useMemo(
    () => (session?.permissions ?? []).includes("inventory.holds.read"),
    [session?.permissions]
  );

  const enabled = !!session && !!bid && !isBranchMismatch && canRead;

  const [q, setQ] = useState("");
  const [cartKeyFilter, setCartKeyFilter] = useState("");
  const [itemIdFilter, setItemIdFilter] = useState("");
  const [expireFilter, setExpireFilter] = useState<ExpireFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("EXPIRE_ASC");
  const [onlyPositiveQty, setOnlyPositiveQty] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { data, isLoading, error, refetch, isFetching } = useInventoryHoldsQuery(bid, enabled, 200);

  useEffect(() => {
    if (!enabled) return;

    const onRefresh: EventListener = () => {
      void refetch();
      setNowMs(Date.now());
    };

    window.addEventListener("internal.refresh", onRefresh);
    return () => window.removeEventListener("internal.refresh", onRefresh);
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10_000);

    return () => window.clearInterval(id);
  }, [enabled]);

  const rawItems = useMemo(() => data ?? [], [data]);

  const itemOptions = useMemo(() => {
    return Array.from(new Set(rawItems.map((x) => String(x.itemId ?? "").trim()).filter(Boolean))).sort();
  }, [rawItems]);

  const cartOptions = useMemo(() => {
    return Array.from(new Set(rawItems.map((x) => String(x.cartKey ?? "").trim()).filter(Boolean))).sort();
  }, [rawItems]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const cartQ = cartKeyFilter.trim().toLowerCase();
    const itemQ = itemIdFilter.trim().toLowerCase();

    const filtered = rawItems.filter((r) => {
      const holdKey = String(r.holdKey ?? "").toLowerCase();
      const cartKey = String(r.cartKey ?? "").toLowerCase();
      const itemId = String(r.itemId ?? "").toLowerCase();
      const qty = Number(r.qty ?? 0);
      const expireAtMs = Number(r.expireAtMs ?? 0);

      if (qq) {
        const matchesSearch =
          holdKey.includes(qq) || cartKey.includes(qq) || itemId.includes(qq);
        if (!matchesSearch) return false;
      }

      if (cartQ && !cartKey.includes(cartQ)) return false;
      if (itemQ && !itemId.includes(itemQ)) return false;
      if (onlyPositiveQty && qty <= 0) return false;

      if (expireFilter === "EXPIRING_SOON" && !(expireAtMs > nowMs && expireAtMs - nowMs <= 60_000)) {
        return false;
      }

      if (expireFilter === "ACTIVE" && expireAtMs <= nowMs) {
        return false;
      }

      if (expireFilter === "EXPIRED" && expireAtMs > nowMs) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered];

    sorted.sort((a, b) => {
      const aExpire = Number(a.expireAtMs ?? 0);
      const bExpire = Number(b.expireAtMs ?? 0);
      const aQty = Number(a.qty ?? 0);
      const bQty = Number(b.qty ?? 0);

      if (sortKey === "EXPIRE_ASC") return aExpire - bExpire;
      if (sortKey === "EXPIRE_DESC") return bExpire - aExpire;
      if (sortKey === "QTY_ASC") return aQty - bQty;
      return bQty - aQty;
    });

    return sorted;
  }, [rawItems, q, cartKeyFilter, itemIdFilter, onlyPositiveQty, expireFilter, sortKey, nowMs]);

  const stats = useMemo(() => {
    const items = list;
    const totalHolds = items.length;
    const totalQty = items.reduce((s, x) => s + (x.qty ?? 0), 0);
    const expSoon = items.filter((x) => x.expireAtMs > nowMs && x.expireAtMs - nowMs <= 60_000).length;

    return { totalHolds, totalQty, expSoon };
  }, [list, nowMs]);

  const hasActiveFilters =
    !!q.trim() ||
    !!cartKeyFilter.trim() ||
    !!itemIdFilter.trim() ||
    expireFilter !== "ALL" ||
    sortKey !== "EXPIRE_ASC" ||
    onlyPositiveQty !== true;

  function resetFilters() {
    setQ("");
    setCartKeyFilter("");
    setItemIdFilter("");
    setExpireFilter("ALL");
    setSortKey("EXPIRE_ASC");
    setOnlyPositiveQty(true);
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
          perm="inventory.holds.read"
          fallback={
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">inventory.holds.read</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Số holds</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.totalHolds}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Tổng qty giữ</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.totalQty}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Sắp hết hạn (≤60s)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.expSoon}</CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filters</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="space-y-2 xl:col-span-2">
                    <Label>Tìm nhanh</Label>
                    <Input
                      placeholder="Search holdKey / cartKey / itemId..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cart</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Filter cartKey..."
                        value={cartKeyFilter}
                        onChange={(e) => setCartKeyFilter(e.target.value)}
                      />
                      {cartOptions.length > 0 && (
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value=""
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) setCartKeyFilter(value);
                          }}
                        >
                          <option value="">Chọn cart gần đây...</option>
                          {cartOptions.slice(0, 20).map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Item</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Filter itemId..."
                        value={itemIdFilter}
                        onChange={(e) => setItemIdFilter(e.target.value)}
                      />
                      {itemOptions.length > 0 && (
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value=""
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) setItemIdFilter(value);
                          }}
                        >
                          <option value="">Chọn item gần đây...</option>
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
                    <Label>Expire</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={expireFilter}
                      onChange={(e) => setExpireFilter(e.target.value as ExpireFilter)}
                    >
                      <option value="ALL">ALL</option>
                      <option value="EXPIRING_SOON">Expiring soon</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_1fr]">
                  <div className="space-y-2">
                    <Label>Sort</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                    >
                      <option value="EXPIRE_ASC">Expire ↑</option>
                      <option value="EXPIRE_DESC">Expire ↓</option>
                      <option value="QTY_DESC">Qty ↓</option>
                      <option value="QTY_ASC">Qty ↑</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={onlyPositiveQty}
                        onChange={(e) => setOnlyPositiveQty(e.target.checked)}
                      />
                      Chỉ hiện qty &gt; 0
                    </label>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {list.length}/{rawItems.length} holds
                      </Badge>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                      >
                        Reset filters
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading && (
              <div className="text-sm text-muted-foreground">
                {isFetching ? "Đang làm mới..." : "Đang tải..."}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error.message}
                  {error.correlationId && (
                    <span className="mt-1 block text-xs">Mã: {error.correlationId}</span>
                  )}
                  <div className="mt-2 text-xs opacity-80">
                    Nếu báo <span className="font-mono">FEATURE_DISABLED</span> /{" "}
                    <span className="font-mono">REDIS_REQUIRED</span>: backend chưa bật Redis holds
                    (cần <span className="font-mono">REDIS_URL</span> +{" "}
                    <span className="font-mono">REDIS_STOCK_HOLDS_ENABLED=true</span>).
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && (
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-2 pr-3">Cart</th>
                          <th className="py-2 pr-3">Item</th>
                          <th className="py-2 pr-3">Qty</th>
                          <th className="py-2 pr-3">ExpireAt</th>
                          <th className="py-2 pr-3">Meta</th>
                        </tr>
                      </thead>

                      <tbody>
                        {list.map((r) => {
                          const isExpired = r.expireAtMs <= nowMs;
                          const isExpSoon =
                            r.expireAtMs > nowMs && r.expireAtMs - nowMs <= 60_000;

                          return (
                            <tr key={r.holdKey} className="border-b last:border-b-0">
                              <td className="py-2 pr-3 font-mono">{r.cartKey}</td>

                              <td className="py-2 pr-3">
                                <div className="font-mono">{r.itemId}</div>
                                <div className="text-xs text-muted-foreground">
                                  branch: {r.branchId}
                                </div>
                              </td>

                              <td className="py-2 pr-3">
                                <Badge variant="secondary">{r.qty}</Badge>
                              </td>

                              <td className="py-2 pr-3">
                                <div>{fmtMs(r.expireAtMs)}</div>
                                <div className="mt-1">
                                  {isExpired && <Badge variant="outline">Expired</Badge>}
                                  {!isExpired && isExpSoon && <Badge variant="outline">≤60s</Badge>}
                                </div>
                              </td>

                              <td className="py-2 pr-3 text-xs text-muted-foreground">
                                <div>hold: {r.holdKey}</div>
                                <div>
                                  opt:{r.optionsHash.slice(0, 6)}… note:{r.noteHash.slice(0, 6)}…
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {list.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-muted-foreground">
                              Không có holds phù hợp với bộ lọc hiện tại.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </Can>
      )}
    </div>
  );
}