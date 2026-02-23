import { useParams } from "react-router-dom";

import { useOrderQuery } from "../hooks/useOrderQuery";
import { useCustomerSessionStore, selectSessionKey, selectBranchId } from "../../../../shared/customer/session/sessionStore";
import { useRealtimeRoom } from "../../../../shared/realtime";

export function CustomerOrderStatusPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const { data, isLoading, error } = useOrderQuery(orderCode);

  const sessionKey = useCustomerSessionStore(selectSessionKey);
  const branchId = useCustomerSessionStore(selectBranchId);

  // Realtime: join room order:<orderCode> (best-effort). Query invalidation handled centrally.
  useRealtimeRoom(
    orderCode ? `order:${orderCode}` : null,
    !!orderCode,
    sessionKey
      ? {
          kind: "customer",
          userKey: sessionKey,
          branchId: branchId ?? undefined,
        }
      : undefined
  );

  if (isLoading) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold text-foreground">Theo dõi đơn</h1>
        <p className="mt-2 text-muted-foreground">Đang tải…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold text-foreground">Theo dõi đơn</h1>
        <p className="mt-2 text-destructive">Có lỗi khi tải trạng thái đơn.</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Theo dõi đơn</h1>

      <div className="mt-4 rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">Mã đơn</div>
        <div className="mt-1 font-mono text-base">{orderCode}</div>

        <div className="mt-4 text-sm text-muted-foreground">Trạng thái</div>
        <div className="mt-1 text-lg font-semibold">{data?.status ?? "—"}</div>
      </div>
    </main>
  );
}
