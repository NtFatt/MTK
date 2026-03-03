import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "zustand";
import { qk } from "@hadilao/contracts";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { useAppMutation } from "../../../../shared/http/useAppMutation";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Button } from "../../../../shared/ui/button";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";

import { useInventoryStockQuery } from "../hooks/useInventoryStockQuery";
import { adjustInventoryStock } from "../services/inventoryApi";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

export function InternalInventoryStockPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const bid = String(branchId ?? "").trim();
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && bid && String(userBranch) !== String(bid);

  const canRead = useMemo(() => (session?.permissions ?? []).includes("inventory.read"), [session?.permissions]);
  const canAdjust = useMemo(() => (session?.permissions ?? []).includes("inventory.adjust"), [session?.permissions]);

  const enabled = !!session && !!bid && !isBranchMismatch && canRead;

  const { data, isLoading, error, refetch, isFetching } = useInventoryStockQuery(bid, enabled);

  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const raw = data ?? [];
    const qq = q.trim().toLowerCase();
    if (!qq) return raw;
    return raw.filter((r) => {
      return (
        String(r.itemId ?? "").toLowerCase().includes(qq) ||
        String(r.itemName ?? "").toLowerCase().includes(qq)
      );
    });
  }, [data, q]);

  // ---- Adjust form ----
  const [itemId, setItemId] = useState("");
  const [mode, setMode] = useState<"RESTOCK" | "DEDUCT" | "SET">("RESTOCK");
  const [quantity, setQuantity] = useState<number>(1);

  const adjustMut = useAppMutation({
    invalidateKeys: [qk.inventory.stock({ branchId: bid }) as unknown as unknown[]],
    mutationFn: async () => {
      const iid = itemId.trim();
      if (!iid) throw new Error("Thiếu itemId");
      if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) throw new Error("Quantity phải > 0");
      return adjustInventoryStock({ branchId: bid, itemId: iid, mode, quantity: Number(quantity) });
    },
    onSuccess: () => {
      // optional: reset
      setQuantity(1);
    },
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory — Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chi nhánh: <span className="font-mono">{bid || "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/i/${bid}/tables`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Tables
          </Link>
          <Link to={`/i/${bid}/cashier`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Cashier
          </Link>
          <Link to={`/i/${bid}/kitchen`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Kitchen
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
          perm="inventory.read"
          fallback={
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">inventory.read</span>
            </div>
          }
        >
          {/* Adjust */}
          <section className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Adjust Stock</CardTitle>
              </CardHeader>
              <CardContent>
                {!canAdjust && (
                  <div className="mb-3 text-sm text-muted-foreground">
                    Bạn không có quyền adjust (cần <span className="font-mono">inventory.adjust</span>).
                  </div>
                )}

                <form
                  className="grid gap-4 md:grid-cols-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canAdjust) adjustMut.mutate();
                  }}
                >
                  <div className="space-y-2 md:col-span-2">
                    <Label>Item</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={itemId}
                      onChange={(e) => setItemId(e.target.value)}
                      disabled={!enabled || !canAdjust}
                    >
                      <option value="">— chọn item —</option>
                      {(data ?? []).slice(0, 500).map((r) => (
                        <option key={String(r.itemId)} value={String(r.itemId ?? "")}>
                          {String(r.itemId)} — {r.itemName ?? "?"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as any)}
                      disabled={!enabled || !canAdjust}
                    >
                      <option value="RESTOCK">RESTOCK</option>
                      <option value="DEDUCT">DEDUCT</option>
                      <option value="SET">SET</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      min={1}
                      disabled={!enabled || !canAdjust}
                    />
                  </div>

                  {adjustMut.error && (
                    <div className="md:col-span-4">
                      <Alert variant="destructive">
                        <AlertDescription>
                          {adjustMut.error.message}
                          {adjustMut.error.correlationId && (
                            <span className="mt-1 block text-xs">Mã: {adjustMut.error.correlationId}</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="md:col-span-4">
                    <Button type="submit" disabled={!enabled || !canAdjust || adjustMut.isPending}>
                      {adjustMut.isPending ? "Đang cập nhật..." : "Apply"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* Stock list */}
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Stock</h2>
              <Input className="max-w-sm" placeholder="Search itemId / name..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            {isLoading && <div className="text-sm text-muted-foreground">Đang tải...</div>}
            {!isLoading && error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Không thể tải stock.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((r) => {
                const avail = r.available ?? 0;
                const hold = r.onHold ?? 0;
                return (
                  <Card key={String(r.itemId)}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">{r.itemName ?? "—"}</CardTitle>
                      <Badge variant={avail > 0 ? "secondary" : "default"}>ID: {String(r.itemId)}</Badge>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <div>Available: <span className="font-mono text-foreground">{avail}</span></div>
                      <div>OnHold: <span className="font-mono text-foreground">{hold}</span></div>
                      {r.updatedAt && <div className="text-xs opacity-70">Updated: {r.updatedAt}</div>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </Can>
      )}
    </main>
  );
}