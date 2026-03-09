import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
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

import { InternalShellNav } from "../../../../layouts/internal/InternalShellNav";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

export function InternalInventoryStockPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const role = session?.role;
  const isAdmin = isAdminRole(role);

  // --- Branch lock ---
  const urlBid = String(branchId ?? "").trim();
  const sessionBid = session?.branchId != null ? String(session.branchId) : "";

  // Non-admin: dùng branchId từ session (hard lock)
  // Admin: dùng branchId trên URL (để switch branch)
  const bid = isAdmin ? urlBid : sessionBid || urlBid;

  // Nếu non-admin gõ URL khác branch của họ -> ép về đúng branch
  const isBranchMismatch = !isAdmin && !!sessionBid && !!urlBid && sessionBid !== urlBid;
  if (session && isBranchMismatch) {
    return <Navigate to={`/i/${sessionBid}/inventory/stock`} replace />;
  }

  // Nếu không có branchId (hiếm) -> đá về login
  if (session && !bid) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  // --- Permissions ---
  const canRead = useMemo(
    () => (session?.permissions ?? []).includes("inventory.read"),
    [session?.permissions]
  );
  const canAdjust = useMemo(
    () => (session?.permissions ?? []).includes("inventory.adjust"),
    [session?.permissions]
  );

  const enabled = !!session && !!bid && canRead;

  const { data, isLoading, error, refetch, isFetching } = useInventoryStockQuery(bid, enabled);

  // ✅ nghe refresh từ layout (InternalShellLayout)
  useEffect(() => {
    const handler = () => void refetch();
    window.addEventListener("internal.refresh", handler as any);
    return () => window.removeEventListener("internal.refresh", handler as any);
  }, [refetch]);

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
    onSuccess: () => setQuantity(1),
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
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
            <Input
              className="max-w-sm"
              placeholder="Search itemId / name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
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
                    <div>
                      Available: <span className="font-mono text-foreground">{avail}</span>
                    </div>
                    <div>
                      OnHold: <span className="font-mono text-foreground">{hold}</span>
                    </div>
                    {r.updatedAt && <div className="text-xs opacity-70">Updated: {r.updatedAt}</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </Can>
    </main>
  );
}