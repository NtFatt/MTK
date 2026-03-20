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
import { realtimeConfig } from "../../../../shared/realtime/config";

type AdjustMode = "RESTOCK" | "DEDUCT" | "SET";
type StockFilter = "all" | "available" | "empty" | "hold";

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

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function formatStockSourceLabel(source: unknown): string {
  return String(source ?? "").toLowerCase() === "redis"
    ? "Redis hold + MySQL"
    : "MySQL only";
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
    [session?.permissions],
  );

  const canAdjust = useMemo(
    () => (session?.permissions ?? []).includes("inventory.adjust"),
    [session?.permissions],
  );

  const enabled =
    !!session && !!bid && canRead && !shouldRedirectBranch && !shouldRedirectMissingBranch;

  useRealtimeRoom(
    bid ? `${realtimeConfig.internalInventoryRoomPrefix}:${bid}` : null,
    enabled,
  );
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
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [adjustSearch, setAdjustSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [mode, setMode] = useState<AdjustMode>("RESTOCK");
  const [quantity, setQuantity] = useState<number>(1);
  const [success, setSuccess] = useState<AdjustSuccessState | null>(null);
  const [lastAdjustedItemId, setLastAdjustedItemId] = useState<string | null>(null);
  const rawList = useMemo(() => data ?? [], [data]);

  const list = useMemo(() => {
    const qq = normalizeText(q);

    return rawList.filter((r) => {
      const avail = Number(r.available ?? 0);
      const hold = Number(r.onHold ?? 0);

      const matchKeyword =
        !qq ||
        normalizeText(r.itemId).includes(qq) ||
        normalizeText(r.itemName).includes(qq);

      if (!matchKeyword) return false;

      switch (stockFilter) {
        case "available":
          return avail > 0;
        case "empty":
          return avail <= 0;
        case "hold":
          return hold > 0;
        case "all":
        default:
          return true;
      }
    });
  }, [rawList, q, stockFilter]);
  const stockSummary = useMemo(() => {
    let available = 0;
    let empty = 0;
    let hold = 0;

    for (const r of rawList) {
      const avail = Number(r.available ?? 0);
      const onHold = Number(r.onHold ?? 0);

      if (avail > 0) {
        available += 1;
      } else {
        empty += 1;
      }

      if (onHold > 0) {
        hold += 1;
      }
    }

    return {
      total: rawList.length,
      available,
      empty,
      hold,
    };
  }, [rawList]);

  const adjustCandidates = useMemo(() => {
    const qq = normalizeText(adjustSearch);
    if (!qq) return rawList.slice(0, 200);

    return rawList
      .filter((r) => {
        return (
          normalizeText(r.itemId).includes(qq) ||
          normalizeText(r.itemName).includes(qq)
        );
      })
      .slice(0, 200);
  }, [rawList, adjustSearch]);

  const selectedStockItem = useMemo(() => {
    return rawList.find((r) => String(r.itemId ?? "") === itemId) ?? null;
  }, [rawList, itemId]);

  const selectedItemName = selectedStockItem?.itemName ?? undefined;
  const selectedItemDbQty = Number(selectedStockItem?.dbQty ?? selectedStockItem?.available ?? 0);
  const selectedItemAvailable = Number(selectedStockItem?.available ?? 0);
  const selectedItemOnHold = Number(selectedStockItem?.onHold ?? 0);

  const adjustMut = useAppMutation<AdjustMutationResult, any, void>({
    invalidateKeys: [
      qk.inventory.stock({ branchId: bid }) as unknown as unknown[],
      qk.inventory.adjustments({ branchId: bid }) as unknown as unknown[],
    ],
    mutationFn: async () => {
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

  function handlePickItem(nextItemId: string) {
    const nextId = String(nextItemId ?? "").trim();
    const picked = rawList.find((r) => String(r.itemId ?? "") === nextId) ?? null;

    setItemId(nextId);
    setAdjustSearch(
      picked ? `${picked.itemId} — ${picked.itemName ?? ""}`.trim() : nextId,
    );
    setSuccess(null);
  }

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

                    <Button type="button" variant="secondary" onClick={() => setSuccess(null)}>
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
                  <Label>Tìm item để adjust</Label>
                  <Input
                    value={adjustSearch}
                    onChange={(e) => {
                      setAdjustSearch(e.target.value);
                      setSuccess(null);
                    }}
                    placeholder="Tìm theo itemId / tên nguyên liệu..."
                    disabled={!enabled || !canAdjust}
                  />
                  <div className="text-xs text-muted-foreground">
                    Gõ để lọc item. Bạn cũng có thể bấm trực tiếp vào card ở phần Stock bên dưới để chọn nhanh.
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Item</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={itemId}
                    onChange={(e) => {
                      handlePickItem(e.target.value);
                    }}
                    disabled={!enabled || !canAdjust}
                  >
                    <option value="">— chọn item —</option>
                    {adjustCandidates.map((r) => (
                      <option key={String(r.itemId)} value={String(r.itemId ?? "")}>
                        {String(r.itemId)} — {r.itemName ?? "?"}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground">
                    Hiển thị tối đa {adjustCandidates.length} item phù hợp trong dropdown.
                  </div>
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
                    value={Number.isFinite(quantity) ? quantity : 1}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setQuantity(Number.isFinite(next) ? next : 0);
                      setSuccess(null);
                    }}
                    disabled={!enabled || !canAdjust}
                  />
                </div>

                {selectedStockItem && (
                  <div className="md:col-span-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="text-xs uppercase text-muted-foreground">Item đang chọn</div>
                      <div className="mt-1 font-medium">
                        {selectedStockItem.itemId} — {selectedStockItem.itemName ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 text-sm">
                      <div className="text-xs uppercase text-muted-foreground">DB qty</div>
                      <div className="mt-1 font-medium">{selectedItemDbQty}</div>
                    </div>

                    <div className="rounded-lg border p-3 text-sm">
                      <div className="text-xs uppercase text-muted-foreground">Reserved</div>
                      <div className="mt-1 font-medium">{selectedItemOnHold}</div>
                    </div>

                    <div className="rounded-lg border p-3 text-sm">
                      <div className="text-xs uppercase text-muted-foreground">Available</div>
                      <div className="mt-1 font-medium">{selectedItemAvailable}</div>
                    </div>
                  </div>
                )}

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

                <div className="md:col-span-4 flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={!enabled || !canAdjust || adjustMut.isPending || !itemId.trim()}
                  >
                    {adjustMut.isPending ? "Đang cập nhật..." : "Apply"}
                  </Button>

                  {itemId && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setItemId("");
                        setAdjustSearch("");
                        setSuccess(null);
                      }}
                      disabled={adjustMut.isPending}
                    >
                      Bỏ chọn item
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Stock</h2>
              <div className="text-sm text-muted-foreground">
                {list.length} / {stockSummary.total} item
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Tồn &gt; 0: {stockSummary.available}</span>
                <span>Hết hàng: {stockSummary.empty}</span>
                <span>Có reserve: {stockSummary.hold}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">DB qty</span> là số trong MySQL,{" "}
                <span className="font-mono">Reserved</span> là hold ở Redis,{" "}
                <span className="font-mono">Available</span> là phần còn có thể bán.
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm md:w-[220px]"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              >
                <option value="all">Tất cả</option>
                <option value="available">Còn hàng</option>
                <option value="empty">Hết hàng</option>
                <option value="hold">Có reserve</option>
              </select>

              <Input
                className="w-full md:w-[320px]"
                placeholder="Search itemId / name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
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
                const dbQty = Number(r.dbQty ?? r.available ?? 0);
                const avail = r.available ?? 0;
                const hold = r.onHold ?? 0;
                const isRecentlyAdjusted = lastAdjustedItemId != null && lastAdjustedItemId === rid;
                const isSelected = itemId === rid;

                return (
                  <Card
                    key={rid}
                    className={[
                      isSelected ? "border-primary ring-1 ring-primary/40" : "",
                      isRecentlyAdjusted ? "border-primary ring-1 ring-primary/30" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <CardTitle className="text-base">{r.itemName ?? "—"}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={avail > 0 ? "secondary" : "default"}>ID: {rid}</Badge>
                        {isSelected && <Badge variant="outline">ĐANG CHỌN</Badge>}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            DB qty
                          </div>
                          <div className="mt-1 font-mono text-base text-foreground">{dbQty}</div>
                        </div>

                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Reserved
                          </div>
                          <div className="mt-1 font-mono text-base text-foreground">{hold}</div>
                        </div>

                        <div className="rounded-md border bg-muted/20 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Available
                          </div>
                          <div className="mt-1 font-mono text-base text-foreground">{avail}</div>
                        </div>
                      </div>

                      <div className="text-xs">
                        Source: <span className="font-medium text-foreground">{formatStockSourceLabel(r.stockSource)}</span>
                      </div>

                      {r.updatedAt && (
                        <div className="text-xs opacity-70">Updated: {r.updatedAt}</div>
                      )}

                      {isRecentlyAdjusted && (
                        <div className="text-xs font-medium text-foreground">
                          Vừa được điều chỉnh.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "secondary" : "default"}
                          onClick={() => handlePickItem(rid)}
                          disabled={!canAdjust}
                        >
                          {isSelected ? "Đã chọn" : "Chọn để adjust"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setQ(rid);
                          }}
                        >
                          Lọc theo item này
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {list.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Không có dữ liệu stock phù hợp với search/filter hiện tại.
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
