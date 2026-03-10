import { useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";

export function InternalInventoryAdjustmentsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = String(branchId ?? "").trim();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Alert>
        <AlertDescription className="text-sm">
          Đây là trang skeleton cho adjustment history của chi nhánh{" "}
          <span className="font-mono">{bid || "—"}</span>. Backend hiện chưa có endpoint riêng cho
          lịch sử điều chỉnh. Khi BE bổ sung endpoint history hoặc expose audit logs phù hợp, trang
          này sẽ nối vào bảng dữ liệu thật.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lịch sử điều chỉnh</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              Mục tiêu của màn này là hiển thị lịch sử thay đổi tồn kho theo thời gian, gồm item,
              mode điều chỉnh, số lượng, người thao tác và thời điểm cập nhật.
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-3 text-sm font-medium text-foreground">Preview vùng dữ liệu</div>
              <div className="h-[320px] rounded-lg border border-dashed bg-background/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Definition of Done</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>Filter theo ngày</span>
              <Badge variant="outline">TODO</Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>Filter theo item</span>
              <Badge variant="outline">TODO</Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>Filter theo actor</span>
              <Badge variant="outline">TODO</Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>Hiện mode + quantity</span>
              <Badge variant="outline">TODO</Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>Phân trang / tải thêm</span>
              <Badge variant="outline">TODO</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}