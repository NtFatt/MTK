import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";

export type KitchenKpiStats = {
  total: number;
  newCount: number;
  receivedCount: number;
  preparingCount: number;
  readyCount: number;
  overdueCount: number;
  missingRecipeCount: number;
  oldestWaitingLabel: string;
};

type KitchenKpiStripProps = {
  stats: KitchenKpiStats;
};

const KPI_DEFINITIONS: Array<{
  key: keyof KitchenKpiStats;
  label: string;
  tone: string;
}> = [
  { key: "total", label: "Ticket mở", tone: "text-[#4e2916]" },
  { key: "newCount", label: "Mới vào", tone: "text-[#b26023]" },
  { key: "preparingCount", label: "PREPARING", tone: "text-[#b13c3c]" },
];

export function KitchenKpiStrip({ stats }: KitchenKpiStripProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {KPI_DEFINITIONS.map((item) => (
        <Card
          key={item.key}
          className="border-[#ead8c0] bg-white/90 shadow-[0_18px_32px_-28px_rgba(60,29,9,0.28)]"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#8a684d]">{item.label}</CardTitle>
          </CardHeader>
          <CardContent className={`text-3xl font-semibold ${item.tone}`}>
            {stats[item.key]}
          </CardContent>
        </Card>
      ))}

      <Card className="border-[#ead8c0] bg-white/90 shadow-[0_18px_32px_-28px_rgba(60,29,9,0.28)] xl:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8a684d]">Tình trạng queue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-[#7a5a43] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Ticket cũ nhất: <span className="font-semibold text-[#4e2916]">{stats.oldestWaitingLabel}</span>
            </span>
            <span className="text-[#ccb08f]">•</span>
            <span>
              Received: <span className="font-semibold text-[#4e2916]">{stats.receivedCount}</span>
            </span>
            <span className="text-[#ccb08f]">•</span>
            <span>
              Ready: <span className="font-semibold text-[#44723b]">{stats.readyCount}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#ead1a9] bg-[#fff6e7] px-3 py-1 font-medium text-[#8b5a1d]">
              Quá SLA {stats.overdueCount}
            </span>
            <span className="rounded-full border border-[#efc4c4] bg-[#fff4f4] px-3 py-1 font-medium text-[#8f2f2f]">
              Thiếu recipe {stats.missingRecipeCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
