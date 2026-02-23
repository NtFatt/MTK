import { useMemo } from "react";
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

function isAdminRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

export function InternalTablesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (s) => s.session);

  const branchParam = branchId ?? "";
  const userBranch = session?.branchId;
  const role = session?.role;

  const isBranchMismatch =
    !isAdminRole(role) && userBranch != null && String(userBranch) !== String(branchParam);

  const canReadTables = useMemo(() => {
    const perms = session?.permissions ?? [];
    return perms.includes("ops.tables.read");
  }, [session?.permissions]);

  const enabled = !!session && !isBranchMismatch && canReadTables;

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
          branchId: session.branchId ?? undefined,
          token: session.accessToken,
        }
      : undefined
  );

  const { data, isLoading, error, refetch } = useOpsTablesQuery(branchParam, enabled);

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
              const code = t.code ?? `#${idx + 1}`;
              const status = t.status ?? "—";
              return (
                <Card key={String(t.id ?? code)}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{code}</CardTitle>
                    <Badge variant={status === "AVAILABLE" ? "secondary" : "default"}>{status}</Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {t.seats != null && <div>Số ghế: {t.seats}</div>}
                    {t.area && <div>Khu: {t.area}</div>}
                    {t.sessionKey && (
                      <div>
                        Session: <span className="font-mono">{t.sessionKey}</span>
                      </div>
                    )}
                    {t.cartKey && (
                      <div>
                        Cart: <span className="font-mono">{t.cartKey}</span>
                      </div>
                    )}
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
