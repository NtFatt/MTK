import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { apiFetchAuthed } from "../../../../shared/http/authedFetch";
import { Can } from "../../../../shared/auth/guards";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Button } from "../../../../shared/ui/button";
import { Badge } from "../../../../shared/ui/badge";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";

type OrderRow = {
  orderCode: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  branchId: string | null;
  tableCode: string | null;

  total?: number;
  subtotal?: number;
  payableTotal?: number;
  totalAmount?: number;
  amount?: number;
};
type SettleCashResponse = {
  orderCode: string;
  txnRef?: string;
  changed: boolean;
  alreadyPaid?: boolean;
};

function uuid(): string {
  // idempotency key
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

function getTotal(it: any): number {
  const raw =
    it?.total ??
    it?.totalAmount ??
    it?.payableTotal ??
    it?.subtotal ??
    it?.amount ??
    it?.grandTotal;
  const v = Number(raw);
  return Number.isFinite(v) ? v : 0;
}

function roundUp(x: number, step: number) {
  return Math.ceil(x / step) * step;
}

function getIdemKey(scope: string): string {
  try {
    const key = `idem:${scope}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const v = uuid();
    sessionStorage.setItem(key, v);
    return v;
  } catch {
    return uuid();
  }
}

function clearIdemKey(scope: string) {
  try {
    sessionStorage.removeItem(`idem:${scope}`);
  } catch {
    // noop: sessionStorage may be unavailable (private mode)
  }
}

export function InternalCashierPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = String(branchId ?? "").trim();

  const [q, setQ] = useState("");
  const [paying, setPaying] = useState<OrderRow | null>(null);
  const [payMethod, setPayMethod] = useState<
    "CASH" | "SHOPEEPAY" | "VISA" | "MASTER" | "JCB" | "ATM" | "OTHER"
  >("CASH");
  const [received, setReceived] = useState<number>(0);
  const listKey = useMemo(() => ["cashier", "unpaid", { branchId: bid }] as const, [bid]);


  const listQuery = useAppQuery<{ items: OrderRow[] }>({
    queryKey: listKey,
    enabled: !!bid,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("branchId", bid);
      return apiFetchAuthed<{ items: OrderRow[] }>(`/admin/cashier/unpaid?${qs.toString()}`);
    },
    staleTime: 3000,
  });

  const settleMutation = useAppMutation<
    SettleCashResponse,
    any,
    { orderCode: string }
  >({
    invalidateKeys: [listKey as unknown as unknown[]],
    mutationFn: async ({ orderCode }) => {
      const scope = `cashier.settle:${orderCode}`;
      const idem = getIdemKey(scope);

      const res = await apiFetchAuthed<SettleCashResponse>(
        `/admin/cashier/settle-cash/${encodeURIComponent(orderCode)}`,
        {
          method: "POST",
          idempotencyKey: idem,
        }
      );

      clearIdemKey(scope);
      return res;
    },
  });

  const filtered = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => {
      return (
        String(it.orderCode ?? "").toLowerCase().includes(s) ||
        String(it.tableCode ?? "").toLowerCase().includes(s)
      );
    });
  }, [listQuery.data, q]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cashier — Unpaid</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chi nhánh: <span className="font-mono">{bid}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/i/${bid}/tables`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Tables
          </Link>
          <Link to={`/i/${bid}/kitchen`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Kitchen
          </Link>
        </div>
      </div>

      <Can
        perm="cashier.unpaid.read"
        fallback={
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không có quyền cashier (cần <span className="font-mono">cashier.unpaid.read</span>).
          </div>
        }
      >
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              className="max-w-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm ORD... / mã bàn..."
            />
            <Button variant="secondary" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
              {listQuery.isFetching ? "Đang tải..." : "Refresh"}
            </Button>
          </div>

          {listQuery.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                {listQuery.error.message}
                {listQuery.error.correlationId && <span className="mt-1 block text-xs">Mã: {listQuery.error.correlationId}</span>}
              </AlertDescription>
            </Alert>
          )}

          {settleMutation.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                {settleMutation.error.message}
                {settleMutation.error.correlationId && (
                  <span className="mt-1 block text-xs">Mã: {settleMutation.error.correlationId}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {filtered.map((it) => (
              <Card key={it.orderCode}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold">{it.orderCode}</CardTitle>
                    <Badge variant="outline">{it.orderStatus}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Bàn: <span className="font-mono text-foreground">{it.tableCode ?? "—"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(it.createdAt).toLocaleString("vi-VN")}
                  </div>

                  <Can perm="cashier.settle_cash" fallback={null}>
                    <Button
                      className="mt-2"
                      disabled={settleMutation.isPending}
                      onClick={() => {
                        setPayMethod("CASH");
                        const total = getTotal(it);
                        setReceived(total || 0);
                        setPaying(it);
                      }}
                    >
                      {settleMutation.isPending ? "Đang thanh toán..." : "Thanh toán tiền mặt"}
                    </Button>
                  </Can>
                </CardContent>
              </Card>
            ))}
          </div>

          {!listQuery.isLoading && filtered.length === 0 && (
            <div className="mt-6 text-sm text-muted-foreground">Không có đơn nào.</div>
          )}
        </section>
      </Can>
      {paying && (() => {
        const total = getTotal(paying);
        const change = Math.max(0, received - total);
        const quick = total ? [roundUp(total, 1000), roundUp(total, 5000), roundUp(total, 10000)] : [];
        const canConfirm =
          payMethod === "CASH" && (total === 0 || received >= total) && !settleMutation.isPending;

        const pressDigit = (d: number) => setReceived((v) => v * 10 + d);
        const press00 = () => setReceived((v) => v * 100);
        const press000 = () => setReceived((v) => v * 1000);
        const backspace = () => setReceived((v) => Math.floor(v / 10));
        const clear = () => setReceived(0);

        return (
          <div className="fixed inset-0 z-[60] bg-black/40 p-4">
            <div className="mx-auto w-full max-w-5xl rounded-xl bg-background shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b p-4">
                <div className="text-lg font-semibold">
                  Thanh toán {paying.tableCode ? `BÀN - ${paying.tableCode}` : ""} {total ? `- ${formatVnd(total)}` : ""}
                </div>
                <button
                  type="button"
                  onClick={() => setPaying(null)}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Đóng
                </button>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-[260px_1fr]">
                {/* Left: methods */}
                <div className="space-y-2">
                  {[
                    ["CASH", "Tiền mặt"],
                    ["SHOPEEPAY", "ShopeePay"],
                    ["VISA", "VISA"],
                    ["MASTER", "Master"],
                    ["JCB", "JCB"],
                    ["ATM", "ATM"],
                    ["OTHER", "Khác"],
                  ].map(([k, label]) => {
                    const disabled = k !== "CASH"; // hiện tại BE settle-cash => chỉ cash
                    const active = payMethod === (k as any);
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPayMethod(k as any)}
                        className={[
                          "w-full rounded-lg border px-3 py-3 text-left text-sm font-medium",
                          active ? "border-primary bg-primary/5" : "hover:bg-muted",
                          disabled ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                        title={disabled ? "Chưa hỗ trợ method này (hiện chỉ cash)" : ""}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Right: calculator */}
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Đã nhận</div>
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2 text-base"
                        value={String(received)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, "");
                          setReceived(digits ? Number(digits) : 0);
                        }}
                      />
                      <div className="mt-1 text-xs text-muted-foreground">{formatVnd(received)}</div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Tổng tiền thanh toán</div>
                      <div className="mt-2 text-lg font-semibold">{total ? formatVnd(total) : "—"}</div>
                      {!total && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          (API chưa trả tổng tiền, vẫn có thể xác nhận)
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Tiền thừa</div>
                      <div className="mt-2 text-lg font-semibold">{total ? formatVnd(change) : "—"}</div>
                    </div>
                  </div>

                  {/* Quick amounts */}
                  {quick.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {quick.map((a) => (
                        <button
                          key={a}
                          type="button"
                          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"
                          onClick={() => setReceived(a)}
                        >
                          {formatVnd(a)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Keypad */}
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 8, 9].map((n) => (
                      <button key={n} type="button" className="rounded-lg border py-4 text-lg font-semibold hover:bg-muted" onClick={() => pressDigit(n)}>
                        {n}
                      </button>
                    ))}
                    <button type="button" className="rounded-lg border py-4 text-sm font-semibold hover:bg-muted" onClick={backspace}>
                      ⌫
                    </button>

                    {[4, 5, 6].map((n) => (
                      <button key={n} type="button" className="rounded-lg border py-4 text-lg font-semibold hover:bg-muted" onClick={() => pressDigit(n)}>
                        {n}
                      </button>
                    ))}
                    <button type="button" className="rounded-lg border py-4 text-sm font-semibold hover:bg-muted" onClick={clear}>
                      C
                    </button>

                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button" className="rounded-lg border py-4 text-lg font-semibold hover:bg-muted" onClick={() => pressDigit(n)}>
                        {n}
                      </button>
                    ))}
                    <div className="rounded-lg border py-4" />

                    <button type="button" className="rounded-lg border py-4 text-lg font-semibold hover:bg-muted" onClick={() => pressDigit(0)}>
                      0
                    </button>
                    <button type="button" className="rounded-lg border py-4 text-lg font-semibold hover:bg-muted" onClick={press00}>
                      00
                    </button>
                    <button type="button" className="rounded-lg border py-4 text-lg font-semibold hover:bg-muted" onClick={press000}>
                      000
                    </button>
                    <div className="rounded-lg border py-4" />
                  </div>

                  <button
                    type="button"
                    className={[
                      "mt-2 w-full rounded-lg py-4 text-base font-semibold",
                      canConfirm ? "bg-green-600 text-white hover:bg-green-700" : "bg-muted text-muted-foreground cursor-not-allowed",
                    ].join(" ")}
                    disabled={!canConfirm}
                    onClick={() => {
                      const ok = window.confirm(`Xác nhận thanh toán cho ${paying.orderCode}?`);
                      if (!ok) return;
                      settleMutation.mutate(
                        { orderCode: paying.orderCode },
                        { onSuccess: () => setPaying(null) }
                      );
                    }}
                  >
                    {settleMutation.isPending ? "Đang thanh toán..." : "Xác nhận thanh toán"}
                  </button>

                  <div className="text-xs text-muted-foreground">
                    * Hiện chỉ hỗ trợ <b>Tiền mặt</b> (API settle-cash).
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}