import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../../shared/auth/authStore";
import { Can } from "../../../../../shared/auth/guards";
import { Badge } from "../../../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../shared/ui/card";
import { Skeleton } from "../../../../../shared/ui/skeleton";
import { useRealtimeRoom } from "../../../../../shared/realtime";
import { realtimeConfig } from "../../../../../shared/realtime/config";
import { useOpsTablesQuery } from "../hooks/useOpsTablesQuery";
import { useAppMutation } from "../../../../../shared/http/useAppMutation";
import { openOpsSession, extractSessionKey } from "../services/opsSessionsApi";
import { apiFetch } from "../../../../../lib/apiFetch";
import { useNavigate } from "react-router-dom";
import { posStore } from "../../../ops/posStore";
import {
  getOrCreateOpsCartBySessionKey,
  extractCartKey,
  getOpsCart,
  normalizeOpsCartItems,
} from "../services/opsCartsApi";

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}
function formatElapsed(iso?: string) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const ms = Date.now() - t;
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
export function InternalTablesPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  // fallback branch cho route /i/pos/tables (không có :branchId)
  const branchParam = branchId ?? (session?.branchId != null ? String(session.branchId) : "");

  const branchKey = Number.isFinite(Number(branchParam)) ? Number(branchParam) : branchParam;
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && String(userBranch) !== String(branchParam);

  const canReadTables = useMemo(() => {
    const perms = session?.permissions ?? [];
    return perms.includes("ops.tables.read");
  }, [session?.permissions]);

  const enabled = !!session && !isBranchMismatch && canReadTables;

  const nav = useNavigate();
  const setTable = useStore(posStore, (s) => s.setTable);
  const setPosSession = useStore(posStore, (s) => s.setSession);
  const room = branchParam
    ? `${realtimeConfig.internalBranchRoomPrefix}:${branchParam}`
    : null;

  useRealtimeRoom(
    room,
    enabled && !!room,
    session
      ? {
        kind: "internal",
        userKey: session.user?.id ? String(session.user.id) : "internal",
        branchId: branchKey ?? undefined,
        token: session.accessToken,
      }
      : undefined
  );

  const { data, isLoading, error, refetch } = useOpsTablesQuery(branchKey, enabled);
  type LiveInfo = {
    sessionKey?: string;
    cartKey?: string;
    startedAt?: string;     // thời gian bắt đầu (fallback từ cart.createdAt)
    items?: { itemId: string; name?: string; qty: number; note?: string }[];
  };
  const [live, setLive] = useState<Record<string, LiveInfo>>({});
  const loadLive = useAppMutation({
    mutationFn: async (t: { tableId: string | number; directionId?: string }) => {
      const s = await openOpsSession({ tableId: t.tableId, directionId: t.directionId });

      const openedAtRaw =
        (s as any)?.session?.openedAt ??
        (s as any)?.data?.session?.openedAt ??
        (s as any)?.sessionOpenedAt ??
        (s as any)?.data?.sessionOpenedAt;

      const startedAt =
        typeof openedAtRaw === "string"
          ? openedAtRaw
          : openedAtRaw
            ? new Date(openedAtRaw).toISOString()
            : undefined;

      const sessionKey = extractSessionKey(s);
      if (!sessionKey) throw new Error("Missing sessionKey from /admin/ops/sessions/open");

      const c = await getOrCreateOpsCartBySessionKey(sessionKey);
      const cartKey = extractCartKey(c);

      if (!cartKey) {
        return { tableId: String(t.tableId), sessionKey, cartKey: "", startedAt, items: [] as any[] };
      }

      const cartDetail = await getOpsCart(cartKey);
      const items = normalizeOpsCartItems(cartDetail);

      // map itemId -> name
      const menuRes = await apiFetch<any>(
        `/menu/items?branchId=${encodeURIComponent(String(branchParam))}&limit=500`
      );

      const menuItems: any[] = Array.isArray(menuRes?.items)
        ? menuRes.items
        : Array.isArray(menuRes)
          ? menuRes
          : [];

      const nameById = new Map(
        menuItems
          .map((x) => [String(x?.id ?? x?.itemId ?? "").trim(), String(x?.name ?? "").trim()] as const)
          .filter(([id, name]) => id && name)
      );

      const itemsWithName = items.map((it) => ({
        ...it,
        name: it.name ?? nameById.get(String(it.itemId)) ?? undefined,
      }));

      return { tableId: String(t.tableId), sessionKey, cartKey, startedAt, items: itemsWithName };
    },

    onSuccess: (out) => {
      setLive((prev) => ({
        ...prev,
        [out.tableId]: {
          sessionKey: out.sessionKey,
          cartKey: out.cartKey,
          startedAt: out.startedAt,
          items: out.items ?? [],
        },
      }));
      void refetch();
    },

  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ops — Danh sách bàn</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chi nhánh: {branchParam || "—"}</p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onClick={() => void refetch()}
          disabled={!enabled}
        >
          Refresh
        </button>
      </div>

      {isBranchMismatch && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Bạn không được phép truy cập dữ liệu chi nhánh khác.
        </div>
      )}

      {!isBranchMismatch && (
        <Can
          perm="ops.tables.read"
          fallback={
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Không đủ quyền: <span className="font-mono">ops.tables.read</span>
            </div>
          }
        >
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {isLoading && (
              <>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-3">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-3">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!isLoading && error && (
              <div className="col-span-full rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Không thể tải danh sách bàn.
              </div>
            )}

            {!isLoading && !error && (data?.length ?? 0) === 0 && (
              <div className="col-span-full rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                Không có dữ liệu bàn.
              </div>
            )}

            {(data ?? []).map((t, idx) => {
              const code = t.code ?? (t.id != null ? `#${t.id}` : `#${idx + 1}`);
              const status = t.status ?? "—";

              const tableIdStr = String(t.id ?? "");
              const liveInfo = (tableIdStr && live[tableIdStr]) ? live[tableIdStr] : {};
              const directionId = (t as any).directionId as string | undefined;
              async function selectTableAndGoMenu(t: any, directionId?: string) {
                if (!t?.id) return;

                // lưu bàn vào store
                setTable({
                  branchId: branchKey,
                  tableId: String(t.id),
                  tableCode: t.code,
                  directionId,
                });

                // open ops session
                const s = await openOpsSession({ tableId: t.id, directionId });
                const sessionKey = extractSessionKey(s);
                if (!sessionKey) throw new Error("Missing sessionKey from /admin/ops/sessions/open");

                // get/create ops cart
                const c = await getOrCreateOpsCartBySessionKey(sessionKey);
                const cartKey = extractCartKey(c) ?? undefined;

                // lưu session/cart vào store
                setPosSession({ sessionKey, cartKey });

                // qua menu POS
                nav("/i/pos/menu");
              }
              return (
                <Card key={String(t.id ?? code)}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{code}</CardTitle>
                    <Badge variant={status === "AVAILABLE" ? "secondary" : "default"}>{status}</Badge>
                  </CardHeader>

                  <CardContent className="text-sm text-muted-foreground">
                    {t.seats != null && <div>Số ghế: {t.seats}</div>}
                    {t.area && <div>Khu: {t.area}</div>}

                    {directionId && (
                      <div>
                        Direction: <span className="font-mono">{directionId}</span>
                      </div>
                    )}

                    {liveInfo?.sessionKey && (
                      <div>
                        Session: <span className="font-mono">{liveInfo.sessionKey}</span>
                      </div>
                    )}

                    {liveInfo?.cartKey && (
                      <div>
                        Cart: <span className="font-mono">{liveInfo.cartKey}</span>
                      </div>
                    )}
                    {liveInfo?.startedAt && (
                      <div>
                        Đang ngồi:{" "}
                        <span className="font-medium text-foreground">
                          {formatElapsed(liveInfo.startedAt) ?? "—"}
                        </span>
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="text-xs uppercase tracking-wide">Món khách gọi</div>

                      {/* 1) Ưu tiên dữ liệu ORDER từ BE */}
                      {t.activeItemsPreview ? (
                        <div className="mt-1 text-xs opacity-80">
                          {t.activeItemsPreview}
                          {t.activeOrderStatus ? <span className="ml-2 opacity-70">({t.activeOrderStatus})</span> : null}
                        </div>
                      ) : (t.activeOrdersCount ?? 0) > 0 ? (
                        <div className="mt-1 text-xs opacity-70">
                          Có {t.activeOrdersCount} đơn đang xử lý{t.activeOrderStatus ? ` (${t.activeOrderStatus})` : ""}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs opacity-70">Chưa có món (khách chưa gọi)</div>
                      )}

                      {/* 2) Nếu đã bấm Chi tiết và load ops cart thì show thêm */}
                      {(liveInfo?.items?.length ?? 0) > 0 && (
                        <>
                          <div className="mt-2 text-[11px] uppercase tracking-wide opacity-60">Chi tiết (ops cart)</div>
                          <ul className="mt-1 space-y-1">
                            {liveInfo.items!.slice(0, 5).map((it) => (
                              <li key={`${it.itemId}-${it.note ?? ""}`} className="flex justify-between gap-2">
                                <span className="truncate">
                                  {it.name ?? `#${it.itemId}`}
                                  {it.note ? <span className="opacity-70"> — {it.note}</span> : null}
                                </span>
                                <span className="font-mono">x{it.qty}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                    <Can perm="ops.sessions.open">
                      <div className="mt-3 flex gap-2">
                        {/* giữ lại nút Chi tiết như cũ nếu bạn muốn xem live ops cart */}
                        <button
                          className="inline-flex items-center justify-center rounded-md border px-3 py-1 text-sm"
                          onClick={() =>
                            void loadLive.mutateAsync({
                              tableId: t.id!,
                              directionId,
                            })
                          }
                          disabled={!enabled || loadLive.isPending || t.id == null}
                          type="button"
                        >
                          {loadLive.isPending ? "Đang tải..." : "Chi tiết"}
                        </button>

                        {/* nút mới: chọn bàn -> qua POS menu */}
                        <button
                          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:opacity-90"
                          onClick={() => void selectTableAndGoMenu(t, directionId)}
                          disabled={!enabled || t.id == null}
                          type="button"
                        >
                          Gọi món
                        </button>
                      </div>
                    </Can>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </Can>
      )}
    </main>
  );
}
