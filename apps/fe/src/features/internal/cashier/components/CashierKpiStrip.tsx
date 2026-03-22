import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { formatVnd } from "../utils/cashierDisplay";

export type CashierKpiStats = {
  unpaidCount: number;
  unpaidValue: number;
  overdueCount: number;
  recentlyUpdatedCount: number;
};

type CashierKpiStripProps = {
  stats: CashierKpiStats;
};

export function CashierKpiStrip({ stats }: CashierKpiStripProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-[#ead8c0] bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8a684d]">Bill chưa thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold text-[#4e2916]">
          {stats.unpaidCount}
        </CardContent>
      </Card>

      <Card className="border-[#ead8c0] bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8a684d]">Tổng giá trị unpaid</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold text-[#b13c3c]">
          {stats.unpaidValue > 0 ? formatVnd(stats.unpaidValue) : "0 đ"}
        </CardContent>
      </Card>

      <Card className="border-[#ead8c0] bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8a684d]">Đơn quá hạn xử lý</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold text-[#8a5a1d]">
          {stats.overdueCount}
        </CardContent>
      </Card>

      <Card className="border-[#ead8c0] bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8a684d]">Đơn vừa cập nhật</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold text-[#2d6d66]">
          {stats.recentlyUpdatedCount}
        </CardContent>
      </Card>
    </section>
  );
}
