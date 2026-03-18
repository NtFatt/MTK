import { useMemo, useState } from "react";

import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";

type MenuItem = {
  id: string;
  name: string;
  category: string;
};

type RecipeLine = {
  ingredientName: string;
  qty: number;
  unit: string;
};

const MOCK_ITEMS: MenuItem[] = [
  { id: "101", name: "Bò Mỹ Nhúng Lẩu", category: "Thịt bò" },
  { id: "102", name: "Mì Udon", category: "Tinh bột" },
  { id: "103", name: "Nấm Kim Châm", category: "Rau nấm" },
];

const MOCK_RECIPE: Record<string, RecipeLine[]> = {
  "101": [
    { ingredientName: "Bò Mỹ", qty: 0.2, unit: "kg" },
    { ingredientName: "Sốt sa tế", qty: 0.02, unit: "lít" },
  ],
  "102": [{ ingredientName: "Mì", qty: 1, unit: "gói" }],
  "103": [{ ingredientName: "Nấm kim châm", qty: 1, unit: "gói" }],
};

export function InternalMenuRecipesPage() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>("101");

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return MOCK_ITEMS;

    return MOCK_ITEMS.filter((item) => {
      return (
        item.name.toLowerCase().includes(qq) ||
        item.category.toLowerCase().includes(qq) ||
        item.id.toLowerCase().includes(qq)
      );
    });
  }, [q]);

  const selected = items.find((x) => x.id === selectedId) ?? MOCK_ITEMS.find((x) => x.id === selectedId) ?? null;
  const lines = selected ? MOCK_RECIPE[selected.id] ?? [] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Công thức món</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình định mức nguyên liệu tiêu hao cho từng món trong menu.
          </p>
        </div>

        <Button type="button">Lưu công thức</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách món</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm món..."
            />

            <div className="space-y-2">
              {items.map((item) => {
                const active = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      active
                        ? "border-foreground bg-muted"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.category} • #{item.id}
                    </div>
                  </button>
                );
              })}

              {items.length === 0 && (
                <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                  Không có món phù hợp.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected ? `Recipe — ${selected.name}` : "Recipe"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Màn này trước mắt là FE layout. Khi BE xong, phần danh sách nguyên liệu, số lượng và lưu
                  sẽ được nối API thật.
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium">Nguyên liệu</th>
                        <th className="px-4 py-3 font-medium">Định mức</th>
                        <th className="px-4 py-3 font-medium">Đơn vị</th>
                        <th className="px-4 py-3 font-medium">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={`${selected.id}-${idx}`} className="border-t">
                          <td className="px-4 py-3">{line.ingredientName}</td>
                          <td className="px-4 py-3">{line.qty}</td>
                          <td className="px-4 py-3">{line.unit}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="secondary">
                                Sửa
                              </Button>
                              <Button type="button" size="sm" variant="secondary">
                                Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                            Chưa có recipe line cho món này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary">
                    Thêm dòng nguyên liệu
                  </Button>
                  <Button type="button">Lưu công thức</Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                Chọn một món ở cột trái để xem recipe.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}