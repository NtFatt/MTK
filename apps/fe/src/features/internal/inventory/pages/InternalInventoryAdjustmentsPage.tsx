import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";

export function InternalInventoryAdjustmentsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = String(branchId ?? "").trim();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory — Adjustments</h1>
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
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lịch sử điều chỉnh</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Trang này là skeleton theo “form admin”.
            <div className="mt-2">
              Backend hiện **chưa có endpoint riêng** cho adjustment history. Khi BE bổ sung (hoặc expose audit_logs),
              mình sẽ nối vào đây để thành bảng audit chuẩn.
            </div>

            <div className="mt-4 h-[360px] rounded-xl border bg-muted/30" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gợi ý DoD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Filter theo ngày</span>
              <Badge variant="outline">TODO</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Filter theo item</span>
              <Badge variant="outline">TODO</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Hiện actor + mode</span>
              <Badge variant="outline">TODO</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}