import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { useInventoryItemsQuery } from "../../inventory/hooks/useInventoryItemsQuery";
import { useAdminMenuItemsQuery } from "../hooks/useAdminMenuItemsQuery";
import { useMenuRecipeQuery } from "../hooks/useMenuRecipeQuery";
import { useSaveMenuRecipeMutation } from "../hooks/useSaveMenuRecipeMutation";
import type { AdminMenuItem } from "../services/adminMenuApi";
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
  const [lines, setLines] = useState<EditableRecipeLine[]>(() => initialLines);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


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

  function resetLines() {
    setLines(initialLines);
    setErrorMessage(null);
  }

  async function handleSave() {
    setErrorMessage(null);

    const payload: SaveMenuRecipeLineInput[] = [];
    const seenIngredientIds = new Set<string>();

    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx];
      const ingredientId = line.ingredientId.trim();
      const qtyText = line.qtyPerItem.trim();
      const unit = line.unit.trim();
      const rowNo = idx + 1;

      const isBlankRow = !ingredientId && !qtyText && !unit;
      if (isBlankRow) {
        setErrorMessage(`Dòng ${rowNo} đang trống. Hãy xóa dòng này hoặc nhập đủ dữ liệu.`);
        return;
      }

      if (!ingredientId) {
        setErrorMessage(`Dòng ${rowNo} chưa chọn nguyên liệu.`);
        return;
      }

      if (seenIngredientIds.has(ingredientId)) {
        setErrorMessage(`Nguyên liệu ở dòng ${rowNo} đang bị trùng.`);
        return;
      }
      seenIngredientIds.add(ingredientId);

      const qtyPerItem = Number(qtyText);
      if (!Number.isFinite(qtyPerItem) || qtyPerItem <= 0) {
        setErrorMessage(`Định mức ở dòng ${rowNo} phải là số lớn hơn 0.`);
        return;
      }

      if (!unit) {
        setErrorMessage(`Dòng ${rowNo} chưa có đơn vị.`);
        return;
      }

      payload.push({
        ingredientId,
        qtyPerItem,
        unit,
      });
    }

    await onSave(payload);
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

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
                          {item.ingredientCode ? ` (${item.ingredientCode})` : ""}
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
                      placeholder="Ví dụ: 200"
                      inputMode="decimal"
                      disabled={disabled}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <Input
                      value={line.unit}
                      onChange={(e) => updateLine(idx, { unit: e.target.value })}
                      placeholder="Ví dụ: gram / ml / phần"
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
                  Chưa có công thức cho món này. Nhấn “Thêm dòng nguyên liệu” để bắt đầu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
        Muốn xóa toàn bộ công thức, hãy xóa hết các dòng rồi bấm “Lưu công thức”.
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addLine} disabled={disabled}>
          Thêm dòng nguyên liệu
        </Button>

        <Button type="button" variant="outline" onClick={resetLines} disabled={disabled}>
          Đặt lại
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");

  const selectedId = searchParams.get("itemId")?.trim() ?? "";

  const itemsQuery = useAdminMenuItemsQuery({
    branchId: branchId ?? undefined,
    limit: 1000,
  });

  const inventoryItemsQuery = useInventoryItemsQuery(branchId ?? null);

  const ingredientOptions = useMemo<IngredientOption[]>(() => {
    const raw = inventoryItemsQuery.data ?? [];
    return raw
      .map((item) => ({
        id: String(item.id),
        ingredientName: String(item.ingredientName ?? ""),
        ingredientCode: String(item.ingredientCode ?? ""),
        unit: String(item.unit ?? ""),
        isActive: Boolean(item.isActive),
      }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, "vi"));
  }, [inventoryItemsQuery.data]);

  const allItems = useMemo<AdminMenuItem[]>(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);

  const filteredItems = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return allItems;

    return allItems.filter((item) => {
      return (
        item.id.toLowerCase().includes(qq) ||
        item.name.toLowerCase().includes(qq) ||
        String(item.categoryId ?? "").toLowerCase().includes(qq) ||
        String(item.categoryName ?? "").toLowerCase().includes(qq)
      );
    });
  }, [allItems, q]);

  const selected = allItems.find((x) => x.id === selectedId) ?? null;

  const recipeQuery = useMenuRecipeQuery(branchId ?? null, selectedId || null);
  const saveMutation = useSaveMenuRecipeMutation(branchId ?? null, selectedId || null);

  const initialLines = useMemo<EditableRecipeLine[]>(() => {
    const recipeLines = recipeQuery.data ?? [];
    return recipeLines.map((line) => ({
      ingredientId: String(line.ingredientId),
      qtyPerItem: String(line.qtyPerItem),
      unit: String(line.unit ?? ""),
    }));
  }, [recipeQuery.data]);

  function selectItem(itemId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("itemId", itemId);
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Công thức món</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình định lượng nguyên liệu theo từng món. Đi từ Menu Management để mở đúng món cần sửa.
          </p>
        </div>

        {branchId ? (
          <Link
            to={`/i/${branchId}/admin/menu`}
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition hover:bg-muted"
          >
            Quay lại Menu Management
          </Link>
        ) : null}
      </div>

      {itemsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Không tải được danh sách món admin.</AlertDescription>
        </Alert>
      )}

      {inventoryItemsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Không tải được danh sách nguyên liệu.</AlertDescription>
        </Alert>
      )}

      {recipeQuery.isError && selectedId && (
        <Alert variant="destructive">
          <AlertDescription>Không tải được công thức của món đã chọn.</AlertDescription>
        </Alert>
      )}

      {saveMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>Lưu công thức thất bại.</AlertDescription>
        </Alert>
      )}

      {selectedId && !selected && !itemsQuery.isLoading && (
        <Alert variant="destructive">
          <AlertDescription>
            Không tìm thấy món đang được chọn. Món này có thể đã bị xóa hoặc không còn nằm trong danh sách admin.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách món</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên, ID hoặc danh mục..."
            />

            {itemsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                Đang tải danh sách món...
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const active = item.id === selectedId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${active
                          ? "border-foreground bg-muted"
                          : "border-border hover:bg-muted/40"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.categoryName || `category #${item.categoryId}`} • item #{item.id}
                          </div>
                        </div>

                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                    </button>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                    Không có món phù hợp bộ lọc hiện tại.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selected ? `Món đang chọn — ${selected.name}` : "Chưa chọn món"}</CardTitle>
            </CardHeader>

            <CardContent>
              {!selected ? (
                <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                  Chọn một món ở cột trái hoặc đi từ Menu Management bằng nút “Công thức”.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Tên món</div>
                    <div className="mt-1 font-medium">{selected.name}</div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Danh mục</div>
                    <div className="mt-1 font-medium">
                      {selected.categoryName || selected.categoryId}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Giá bán</div>
                    <div className="mt-1 font-medium">
                      {selected.price.toLocaleString("vi-VN")} đ
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-xs uppercase text-muted-foreground">Trạng thái</div>
                    <div className="mt-1">
                      <Badge variant={selected.isActive ? "default" : "secondary"}>
                        {selected.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selected ? `Công thức — ${selected.name}` : "Công thức"}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!selected ? (
                <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                  Chưa có món nào được chọn.
                </div>
              ) : recipeQuery.isLoading ? (
                <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
                  Đang tải công thức...
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
    </div>
  );
}