import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Badge } from "../../../../shared/ui/badge";

export function InternalDashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tổng đơn hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">128</div>
            <Badge variant="secondary">+12%</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Doanh thu</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">32.5M</div>
            <Badge variant="secondary">+8%</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bàn đang hoạt động</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">17</div>
            <Badge variant="secondary">Live</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Kho sắp hết</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">6</div>
            <Badge variant="destructive">Attention</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Biểu đồ doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            {/* placeholder: sau nối recharts */}
            <div className="h-[260px] rounded-xl border bg-muted/30" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Order #HDL-1021</span>
              <Badge variant="secondary">Paid</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Stock adjust: Beef</span>
              <Badge variant="secondary">+10</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Kitchen: #HDL-1018</span>
              <Badge variant="secondary">Done</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}