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
import { useRealtimeRoom } from "../../../../shared/realtime/useRealtimeRoom";

type AdjustMode = "RESTOCK" | "DEDUCT" | "SET";

type AdjustSuccessState = {
  itemId: string;
  itemName?: string;
  mode: AdjustMode;
  quantity: number;
  atMs: number;
};

type AdjustMutationResult = {
  requested: {
    itemId: string;
    itemName?: string;
    mode: AdjustMode;
    quantity: number;
  };
  response: unknown;
};

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

export function InternalInventoryStockPage() {
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

  const canRead = useMemo(
    () => (session?.permissions ?? []).includes("inventory.read"),
    [session?.permissions]
  );

  const canAdjust = useMemo(
    () => (session?.permissions ?? []).includes("inventory.adjust"),
    [session?.permissions]
  );

  const enabled =
    !!session && !!bid && canRead && !shouldRedirectBranch && !shouldRedirectMissingBranch;

  useRealtimeRoom(bid ? `branch:${bid}` : null, enabled);
  const { data, isLoading, error, refetch, isFetching } = useInventoryStockQuery(bid, enabled);

  useEffect(() => {
    if (!enabled) return;

    const handler: EventListener = () => {
      void refetch();
    };

    window.addEventListener("internal.refresh", handler);
    return () => window.removeEventListener("internal.refresh", handler);
  }, [enabled, refetch]);

  const [q, setQ] = useState("");
  const [itemId, setItemId] = useState("");
  const [mode, setMode] = useState<AdjustMode>("RESTOCK");
  const [quantity, setQuantity] = useState<number>(1);
  const [success, setSuccess] = useState<AdjustSuccessState | null>(null);
  const [lastAdjustedItemId, setLastAdjustedItemId] = useState<string | null>(null);

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

  const selectedItemName = useMemo(() => {
    const found = (data ?? []).find((r) => String(r.itemId ?? "") === itemId);
    return found?.itemName ?? undefined;
  }, [data, itemId]);

  const adjustMut = useAppMutation<AdjustMutationResult, any, void>({
    invalidateKeys: [
      qk.inventory.stock({ branchId: bid }) as unknown as unknown[],
      qk.inventory.adjustments({ branchId: bid }) as unknown as unknown[],
    ], mutationFn: async () => {
      const iid = itemId.trim();
      const qty = Number(quantity);

      if (!iid) throw new Error("Thiếu itemId");
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error("Quantity phải > 0");
      }

      const response = await adjustInventoryStock({
        branchId: bid,
        itemId: iid,
        mode,
        quantity: qty,
      });

      return {
        requested: {
          itemId: iid,
          itemName: selectedItemName,
          mode,
          quantity: qty,
        },
        response,
      };
    },
    onSuccess: (out) => {
      setQuantity(1);
      setSuccess({
        itemId: out.requested.itemId,
        itemName: out.requested.itemName,
        mode: out.requested.mode,
        quantity: out.requested.quantity,
        atMs: Date.now(),
      });
      setLastAdjustedItemId(out.requested.itemId);
      void refetch();
    },
  });

  if (shouldRedirectBranch) {
    return <Navigate to={`/i/${sessionBid}/inventory/stock`} replace />;
  }

  if (shouldRedirectMissingBranch) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Can
        perm="inventory.read"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền: <span className="font-mono">inventory.read</span>
          </div>
        }
      >
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Adjust Stock</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!canAdjust && (
                <div className="text-sm text-muted-foreground">
                  Bạn không có quyền adjust (cần{" "}
                  <span className="font-mono">inventory.adjust</span>).
                </div>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      Đã áp dụng <span className="font-mono">{success.mode}</span>{" "}
                      <span className="font-semibold">{success.quantity}</span> cho{" "}
                      <span className="font-mono">{success.itemId}</span>
                      {success.itemName ? ` — ${success.itemName}` : ""} lúc{" "}
                      {new Date(success.atMs).toLocaleTimeString("vi-VN")}.
                    </span>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSuccess(null)}
                    >
                      Ẩn
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <form
                className="grid gap-4 md:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSuccess(null);
                  if (canAdjust) adjustMut.mutate();
                }}
              >
                <div className="space-y-2 md:col-span-2">
                  <Label>Item</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={itemId}
                    onChange={(e) => {
                      setItemId(e.target.value);
                      setSuccess(null);
                    }}
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
                    onChange={(e) => {
                      setMode(e.target.value as AdjustMode);
                      setSuccess(null);
                    }}
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
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(Number(e.target.value));
                      setSuccess(null);
                    }}
                    disabled={!enabled || !canAdjust}
                  />
                </div>

                {itemId && (
                  <div className="md:col-span-4 text-sm text-muted-foreground">
                    Sắp áp dụng <span className="font-mono">{mode}</span> với số lượng{" "}
                    <span className="font-semibold">{quantity}</span> cho{" "}
                    <span className="font-mono">{itemId}</span>
                    {selectedItemName ? ` — ${selectedItemName}` : ""}.
                  </div>
                )}

                {adjustMut.error && (
                  <div className="md:col-span-4">
                    <Alert variant="destructive">
                      <AlertDescription>
                        {adjustMut.error.message}
                        {adjustMut.error.correlationId && (
                          <span className="mt-1 block text-xs">
                            Mã: {adjustMut.error.correlationId}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="md:col-span-4">
                  <Button
                    type="submit"
                    disabled={!enabled || !canAdjust || adjustMut.isPending || !itemId.trim()}
                  >
                    {adjustMut.isPending ? "Đang cập nhật..." : "Apply"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Stock</h2>
            <Input
              className="max-w-sm"
              placeholder="Search itemId / name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">
              {isFetching ? "Đang làm mới..." : "Đang tải..."}
            </div>
          )}

          {!isLoading && error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message || "Không thể tải stock."}
                {error.correlationId && (
                  <span className="mt-1 block text-xs">Mã: {error.correlationId}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((r) => {
                const rid = String(r.itemId);
                const avail = r.available ?? 0;
                const hold = r.onHold ?? 0;
                const isRecentlyAdjusted = lastAdjustedItemId != null && lastAdjustedItemId === rid;

                return (
                  <Card
                    key={rid}
                    className={isRecentlyAdjusted ? "border-primary ring-1 ring-primary/30" : undefined}
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">{r.itemName ?? "—"}</CardTitle>
                      <Badge variant={avail > 0 ? "secondary" : "default"}>
                        ID: {rid}
                      </Badge>
                    </CardHeader>

                    <CardContent className="text-sm text-muted-foreground">
                      <div>
                        Available: <span className="font-mono text-foreground">{avail}</span>
                      </div>
                      <div>
                        OnHold: <span className="font-mono text-foreground">{hold}</span>
                      </div>
                      {r.updatedAt && (
                        <div className="text-xs opacity-70">Updated: {r.updatedAt}</div>
                      )}
                      {isRecentlyAdjusted && (
                        <div className="mt-2 text-xs font-medium text-foreground">
                          Vừa được điều chỉnh.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {list.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Không có dữ liệu stock.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>
      </Can>
    </div>
  );
}