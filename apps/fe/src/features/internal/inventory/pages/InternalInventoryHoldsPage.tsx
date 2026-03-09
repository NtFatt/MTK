import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Button } from "../../../../shared/ui/button";
import { Badge } from "../../../../shared/ui/badge";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";

import { useInventoryHoldsQuery } from "../hooks/useInventoryHoldsQuery";

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
  const { data, isLoading, error, refetch, isFetching } = useInventoryHoldsQuery(bid, enabled, 200);

  const list = useMemo(() => {
    const raw = data ?? [];
    const qq = q.trim().toLowerCase();
    if (!qq) return raw;
    return raw.filter((r) => {
      return (
        r.cartKey.toLowerCase().includes(qq) ||
        r.itemId.toLowerCase().includes(qq) ||
        r.holdKey.toLowerCase().includes(qq)
      );
    });
  }, [data, q]);

  const stats = useMemo(() => {
    const items = list;
    const totalHolds = items.length;
    const totalQty = items.reduce((s, x) => s + (x.qty ?? 0), 0);
    const now = Date.now();
    const expSoon = items.filter((x) => x.expireAtMs > 0 && x.expireAtMs - now <= 60_000).length; // <= 60s
    return { totalHolds, totalQty, expSoon };
  }, [list]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory — Holds</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chi nhánh: <span className="font-mono">{bid || "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/i/${bid}/admin/inventory/stock`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Stock
          </Link>
          <Link to={`/i/${bid}/admin/inventory/holds`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Holds
          </Link>
          <Link to={`/i/${bid}/admin/inventory/adjustments`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Adjustments
          </Link>
          <Button variant="secondary" onClick={() => void refetch()} disabled={!enabled || isFetching}>
            {isFetching ? "Đang tải..." : "Refresh"}
          </Button>
        </div>
      </div>

      {isBranchMismatch && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="inventory.holds.read"
          fallback={
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">inventory.holds.read</span>
            </div>
          }
        >
          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
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

          {/* Search + Table */}
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Danh sách holds</h2>
              <Input
                className="max-w-sm"
                placeholder="Search cartKey / itemId / holdKey..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {isLoading && <div className="text-sm text-muted-foreground">Đang tải...</div>}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error.message}
                  {error.correlationId && <span className="mt-1 block text-xs">Mã: {error.correlationId}</span>}
                  <div className="mt-2 text-xs opacity-80">
                    Nếu báo <span className="font-mono">FEATURE_DISABLED</span> / <span className="font-mono">REDIS_REQUIRED</span>:
                    backend chưa bật Redis holds (cần REDIS_URL + REDIS_STOCK_HOLDS_ENABLED=true).
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
                        {list.map((r) => (
                          <tr key={r.holdKey} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-mono">{r.cartKey}</td>
                            <td className="py-2 pr-3">
                              <div className="font-mono">{r.itemId}</div>
                              <div className="text-xs text-muted-foreground">branch: {r.branchId}</div>
                            </td>
                            <td className="py-2 pr-3">
                              <Badge variant="secondary">{r.qty}</Badge>
                            </td>
                            <td className="py-2 pr-3">{fmtMs(r.expireAtMs)}</td>
                            <td className="py-2 pr-3 text-xs text-muted-foreground">
                              opt:{r.optionsHash.slice(0, 6)}… note:{r.noteHash.slice(0, 6)}…
                            </td>
                          </tr>
                        ))}

                        {list.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-muted-foreground">
                              Không có holds.
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
    </main>
  );
}