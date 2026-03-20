import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { Badge } from "../../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { useInventoryAlertsQuery } from "../hooks/useInventoryAlertsQuery";

import { useStore } from "zustand";
import { authStore } from "../../../../shared/auth/authStore";
import { useRealtimeRoom } from "../../../../shared/realtime";
import { realtimeConfig } from "../../../../shared/realtime/config";
function toneClass(level: "WARNING" | "CRITICAL") {
  if (level === "CRITICAL") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-700";
}

export function InternalInventoryAlertsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const alertsQuery = useInventoryAlertsQuery(branchId ?? null);

  const rows = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);

  const summary = useMemo(() => {
    const critical = rows.filter((x) => x.alertLevel === "CRITICAL").length;
    const warning = rows.filter((x) => x.alertLevel === "WARNING").length;
    return { critical, warning, total: rows.length };
  }, [rows]);
  const session = useStore(authStore, (s) => s.session);
  const branchParam = String(branchId ?? "").trim();

  useRealtimeRoom(
    branchParam ? `${realtimeConfig.internalInventoryRoomPrefix}:${branchParam}` : null,
    !!session && !!branchParam,
    session
      ? {
        kind: "internal",
        userKey: session.user?.id ? String(session.user.id) : "internal",
        branchId: branchParam || (session.branchId != null ? String(session.branchId) : undefined),
        token: session.accessToken,
      }
      : undefined
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cảnh báo tồn</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi nguyên liệu sắp thiếu hoặc đã chạm ngưỡng nguy cấp để xử lý kịp thời.
        </p>
      </div>

      {alertsQuery.isError && (
        <Alert>
          <AlertDescription>
            Không tải được dữ liệu cảnh báo tồn từ API.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tổng cảnh báo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Warning</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.warning}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critical</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.critical}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách cần chú ý</CardTitle>
        </CardHeader>
        <CardContent>
          {alertsQuery.isLoading ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
              Đang tải dữ liệu cảnh báo...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Nguyên liệu</th>
                    <th className="px-4 py-3 font-medium">Tồn hiện tại</th>
                    <th className="px-4 py-3 font-medium">Ngưỡng cảnh báo</th>
                    <th className="px-4 py-3 font-medium">Mức độ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.ingredientName}</td>
                      <td className="px-4 py-3">
                        {row.currentQty} {row.unit}
                      </td>
                      <td className="px-4 py-3">
                        warning {row.warningThreshold} / critical {row.criticalThreshold}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={toneClass(row.alertLevel)}>
                          {row.alertLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        Không có nguyên liệu nào ở mức cảnh báo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
