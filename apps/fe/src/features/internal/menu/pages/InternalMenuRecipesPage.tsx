import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { useMenuQuery } from "../../../customer/menu/hooks/useMenuQuery";
import { useInventoryItemsQuery } from "../../inventory/hooks/useInventoryItemsQuery";
import { useMenuRecipeQuery } from "../hooks/useMenuRecipeQuery";
import { useSaveMenuRecipeMutation } from "../hooks/useSaveMenuRecipeMutation";
import type { SaveMenuRecipeLineInput } from "../services/menuRecipesApi";

type EditableRecipeLine = {
  ingredientId: string;
  qtyPerItem: string;
  unit: string;
};

type IngredientOption = {
  id: string;
  ingredientName: string;
  ingredientCode: string;
  unit: string;
  isActive: boolean;
};

type RecipeLinesEditorProps = {
  initialLines: EditableRecipeLine[];
  ingredientOptions: IngredientOption[];
  disabled: boolean;
  onSave: (lines: SaveMenuRecipeLineInput[]) => Promise<void>;
};

function RecipeLinesEditor({
  initialLines,
  ingredientOptions,
  disabled,
  onSave,
}: RecipeLinesEditorProps) {
  const [lines, setLines] = useState<EditableRecipeLine[]>(initialLines);

  function updateLine(idx: number, patch: Partial<EditableRecipeLine>) {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        ingredientId: "",
        qtyPerItem: "",
        unit: "",
      },
    ]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const payload: SaveMenuRecipeLineInput[] = lines.map((line) => ({
      ingredientId: line.ingredientId.trim(),
      qtyPerItem: Number(line.qtyPerItem || "0"),
      unit: line.unit.trim(),
    }));

    await onSave(payload);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Ingredient ID</th>
              <th className="px-4 py-3 font-medium">Tên nguyên liệu</th>
              <th className="px-4 py-3 font-medium">Định mức</th>
              <th className="px-4 py-3 font-medium">Đơn vị</th>
              <th className="px-4 py-3 font-medium">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line, idx) => {
              const selectedIngredient =
                ingredientOptions.find((x) => x.id === line.ingredientId) ?? null;

              return (
                <tr key={`recipe-line-${idx}`} className="border-t">
                  <td className="px-4 py-3">
                    <select
                      value={line.ingredientId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const picked =
                          ingredientOptions.find((x) => x.id === nextId) ?? null;

                        updateLine(idx, {
                          ingredientId: nextId,
                          unit: picked?.unit ?? line.unit,
                        });
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      disabled={disabled}
                    >
                      <option value="">Chọn nguyên liệu</option>
                      {ingredientOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.id} — {item.ingredientName}
                          {!item.isActive ? " (inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <Input
                      value={selectedIngredient?.ingredientName ?? ""}
                      readOnly
                      placeholder="Tên nguyên liệu"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <Input
                      value={line.qtyPerItem}
                      onChange={(e) => updateLine(idx, { qtyPerItem: e.target.value })}
                      placeholder="qty"
                      inputMode="decimal"
                      disabled={disabled}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <Input
                      value={line.unit}
                      onChange={(e) => updateLine(idx, { unit: e.target.value })}
                      placeholder="unit"
                      disabled={disabled}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => removeLine(idx)}
                      disabled={disabled}
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              );
            })}

            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Chưa có recipe line cho món này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addLine} disabled={disabled}>
          Thêm dòng nguyên liệu
        </Button>

        <Button type="button" onClick={() => void handleSave()} disabled={disabled}>
          {disabled ? "Đang lưu..." : "Lưu công thức"}
        </Button>
      </div>
    </div>
  );
}

export function InternalMenuRecipesPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const menuQuery = useMenuQuery({
    branchId: branchId ? Number(branchId) : undefined,
  });

  const inventoryItemsQuery = useInventoryItemsQuery(branchId ?? null);

  const ingredientOptions = useMemo<IngredientOption[]>(() => {
    const raw = inventoryItemsQuery.data ?? [];
    return raw.map((item) => ({
      id: String(item.id),
      ingredientName: String(item.ingredientName ?? ""),
      ingredientCode: String(item.ingredientCode ?? ""),
      unit: String(item.unit ?? ""),
      isActive: Boolean(item.isActive),
    }));
  }, [inventoryItemsQuery.data]);

  const items = useMemo(() => {
    const raw = menuQuery.data?.items ?? [];
    const qq = q.trim().toLowerCase();

    const normalized = raw.map((item) => ({
      id: String(item.id),
      name: String(item.name ?? ""),
      categoryId: item.categoryId != null ? String(item.categoryId) : "",
    }));

    if (!qq) return normalized;

    return normalized.filter((item) => {
      return (
        item.id.toLowerCase().includes(qq) ||
        item.name.toLowerCase().includes(qq) ||
        item.categoryId.toLowerCase().includes(qq)
      );
    });
  }, [menuQuery.data?.items, q]);

  const recipeQuery = useMenuRecipeQuery(branchId ?? null, selectedId || null);
  const saveMutation = useSaveMenuRecipeMutation(branchId ?? null, selectedId || null);

  const selected = items.find((x) => x.id === selectedId) ?? null;

  const initialLines = useMemo<EditableRecipeLine[]>(() => {
    const recipeLines = recipeQuery.data ?? [];
    return recipeLines.map((line) => ({
      ingredientId: String(line.ingredientId),
      qtyPerItem: String(line.qtyPerItem),
      unit: String(line.unit ?? ""),
    }));
  }, [recipeQuery.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Công thức món</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình định mức nguyên liệu tiêu hao cho từng món trong menu.
          </p>
        </div>
      </div>

      {menuQuery.isError && (
        <Alert>
          <AlertDescription>Không tải được danh sách món.</AlertDescription>
        </Alert>
      )}

      {inventoryItemsQuery.isError && (
        <Alert>
          <AlertDescription>Không tải được danh sách nguyên liệu.</AlertDescription>
        </Alert>
      )}

      {recipeQuery.isError && selectedId && (
        <Alert>
          <AlertDescription>Không tải được công thức món đã chọn.</AlertDescription>
        </Alert>
      )}

      {saveMutation.isError && (
        <Alert>
          <AlertDescription>Lưu công thức thất bại.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách món</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món..." />

            {menuQuery.isLoading ? (
              <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                Đang tải danh sách món...
              </div>
            ) : (
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
                        category #{item.categoryId || "?"} • item #{item.id}
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? `Recipe — ${selected.name}` : "Recipe"}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!selected ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                Chọn một món ở cột trái để xem recipe.
              </div>
            ) : recipeQuery.isLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                Đang tải recipe...
              </div>
            ) : (
              <RecipeLinesEditor
                key={`${selectedId}:${recipeQuery.dataUpdatedAt}`}
                initialLines={initialLines}
                ingredientOptions={ingredientOptions}
                disabled={saveMutation.isPending}
                onSave={async (lines) => {
                  if (!branchId || !selectedId) return;

                  await saveMutation.mutateAsync({
                    branchId,
                    menuItemId: selectedId,
                    lines,
                  });
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}