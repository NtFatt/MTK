import { useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { useInventoryItemsQuery } from "../../inventory/hooks/useInventoryItemsQuery";
import { useAdminMenuItemsQuery } from "../hooks/useAdminMenuItemsQuery";
import {
  useMenuRecipePresenceMap,
  type MenuRecipePresenceSummary,
} from "../hooks/useMenuRecipePresenceMap";
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

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

type RecipeFilter = "all" | "missing" | "ready";

type RecipePageNavigationState = {
  preselectedItem?: unknown;
} | null;

type RecipeLinesEditorProps = {
  initialLines: EditableRecipeLine[];
  ingredientOptions: IngredientOption[];
  disabled: boolean;
  onSave: (lines: SaveMenuRecipeLineInput[]) => Promise<void>;
};

function extractErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Lưu công thức thất bại.";
}

function getSellableQty(item: AdminMenuItem | null): number | null {
  if (!item) return null;
  if (item.stockQty == null || !Number.isFinite(Number(item.stockQty))) {
    return null;
  }
  return Math.max(0, Number(item.stockQty));
}

function getRecipeReason(
  item: AdminMenuItem | null,
  recipeSummary?: MenuRecipePresenceSummary,
): string {
  if (!item) return "Chưa chọn món.";

  const sellableQty = getSellableQty(item);

  if (!item.isActive) {
    return "Món đang inactive.";
  }

  if (!recipeSummary) {
    return "Đang kiểm tra trạng thái công thức của món này.";
  }

  if (recipeSummary.status === "missing") {
    return "Món chưa có công thức. Hãy thêm recipe line rồi lưu.";
  }

  if (recipeSummary.status === "error") {
    return "Không đọc được trạng thái công thức của món này.";
  }

  if (sellableQty === null) {
    return "Đã có công thức nhưng chưa đồng bộ được số có thể bán.";
  }

  if (sellableQty <= 0) {
    return "Đã có công thức nhưng hiện không đủ nguyên liệu để bán.";
  }

  return "Món đã có công thức và đang có thể bán.";
}

function normalizeMenuItemSnapshot(value: unknown): AdminMenuItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = String(row.id ?? row.itemId ?? "").trim();
  const categoryId = String(row.categoryId ?? row.category_id ?? "").trim();
  const name = String(row.name ?? row.itemName ?? "").trim();
  const price = Number(row.price ?? 0);

  if (!id || !categoryId || !name || !Number.isFinite(price)) {
    return null;
  }

  return {
    id,
    categoryId,
    categoryName:
      row.categoryName != null
        ? String(row.categoryName)
        : row.category_name != null
          ? String(row.category_name)
          : undefined,
    name,
    price,
    description: row.description == null ? null : String(row.description),
    imageUrl:
      row.imageUrl != null
        ? String(row.imageUrl)
        : row.image_url != null
          ? String(row.image_url)
          : null,
    isActive:
      row.isActive != null
        ? Boolean(row.isActive)
        : Boolean(Number(row.is_active ?? 0)),
    isCombo:
      row.isCombo != null
        ? Boolean(row.isCombo)
        : row.is_combo != null
          ? Boolean(Number(row.is_combo))
          : undefined,
    isMeat:
      row.isMeat != null
        ? Boolean(row.isMeat)
        : row.is_meat != null
          ? Boolean(Number(row.is_meat))
          : undefined,
    stockQty:
      row.stockQty != null
        ? Number(row.stockQty)
        : row.stock_qty != null
          ? Number(row.stock_qty)
          : null,
  };
}

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
                        const picked = ingredientOptions.find((x) => x.id === nextId) ?? null;

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [flash, setFlash] = useState<FlashState>(null);

  const selectedId = searchParams.get("itemId")?.trim() ?? "";
  const navigationState = location.state as RecipePageNavigationState;
  const fallbackSelectedItem = useMemo(() => {
    const candidate = normalizeMenuItemSnapshot(navigationState?.preselectedItem);
    if (!candidate || !selectedId || candidate.id !== selectedId) {
      return null;
    }
    return candidate;
  }, [navigationState, selectedId]);

  const itemsQuery = useAdminMenuItemsQuery({
    branchId: branchId ?? undefined,
    limit: 1000,
  }, {
    refetchOnMount: selectedId ? "always" : true,
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

  const itemsFromQuery = useMemo<AdminMenuItem[]>(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);
  const allItems = useMemo<AdminMenuItem[]>(() => {
    if (!fallbackSelectedItem) {
      return itemsFromQuery;
    }

    if (itemsFromQuery.some((item) => item.id === fallbackSelectedItem.id)) {
      return itemsFromQuery;
    }

    return [fallbackSelectedItem, ...itemsFromQuery];
  }, [fallbackSelectedItem, itemsFromQuery]);
  const recipePresenceQuery = useMenuRecipePresenceMap(
    branchId ?? null,
    allItems.map((item) => item.id),
  );

  const recipePresenceByItem = useMemo<Record<string, MenuRecipePresenceSummary>>(() => {
    return recipePresenceQuery.data ?? {};
  }, [recipePresenceQuery.data]);

  const filteredItems = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return allItems.filter((item) => {
      const recipeState = recipePresenceByItem[item.id]?.status;
      const matchKeyword =
        !qq ||
        item.id.toLowerCase().includes(qq) ||
        item.name.toLowerCase().includes(qq) ||
        String(item.categoryId ?? "").toLowerCase().includes(qq) ||
        String(item.categoryName ?? "").toLowerCase().includes(qq);

      if (!matchKeyword) return false;

      switch (recipeFilter) {
        case "missing":
          return recipeState === "missing";
        case "ready":
          return recipeState === "ready";
        case "all":
        default:
          return true;
      }
    });
  }, [allItems, q, recipeFilter, recipePresenceByItem]);

  const selected = allItems.find((x) => x.id === selectedId) ?? null;
  const selectedRecipePresence = selected ? recipePresenceByItem[selected.id] : undefined;
  const recipeQuery = useMenuRecipeQuery(branchId ?? null, selectedId || null);
  const saveMutation = useSaveMenuRecipeMutation(branchId ?? null, selectedId || null);

  const shouldShowSelectedNotFoundAlert =
    Boolean(selectedId) &&
    !selected &&
    itemsQuery.isSuccess &&
    !itemsQuery.isFetching;

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
    setFlash(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Công thức món</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình định lượng nguyên liệu theo từng món. PR25 bổ sung badge “chưa có công thức” và làm rõ vì sao món active nhưng sellable vẫn bằng 0.
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

      {flash && (
        <Alert variant={flash.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{flash.message}</AlertDescription>
        </Alert>
      )}

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

      {shouldShowSelectedNotFoundAlert && (
        <Alert variant="destructive">
          <AlertDescription>
            Không tìm thấy món đang được chọn trong dữ liệu recipe hiện tại. Hãy quay lại danh sách món và chọn lại.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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

            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={recipeFilter}
              onChange={(e) => setRecipeFilter(e.target.value as RecipeFilter)}
            >
              <option value="all">Tất cả</option>
              <option value="missing">Chưa có công thức</option>
              <option value="ready">Đã có công thức</option>
            </select>

            {recipePresenceQuery.isLoading && !itemsQuery.isLoading ? (
              <div className="text-xs text-muted-foreground">
                Đang kiểm tra trạng thái công thức của từng món...
              </div>
            ) : null}

            {itemsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                Đang tải danh sách món...
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const active = item.id === selectedId;
                  const recipeState = recipePresenceByItem[item.id]?.status;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${active ? "border-foreground bg-muted" : "border-border hover:bg-muted/40"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.categoryName || `category #${item.categoryId}`} • item #{item.id}
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>

                          {recipeState === "missing" ? (
                            <Badge variant="destructive">CHƯA CÓ CÔNG THỨC</Badge>
                          ) : recipeState === "ready" ? (
                            <Badge variant="outline">READY</Badge>
                          ) : recipeState === "error" ? (
                            <Badge variant="secondary">LỖI ĐỌC RECIPE</Badge>
                          ) : (
                            <Badge variant="secondary">ĐANG KIỂM TRA</Badge>
                          )}
                        </div>
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
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="text-xs uppercase text-muted-foreground">Tên món</div>
                      <div className="mt-1 font-medium">{selected.name}</div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="text-xs uppercase text-muted-foreground">Danh mục</div>
                      <div className="mt-1 font-medium">{selected.categoryName || selected.categoryId}</div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="text-xs uppercase text-muted-foreground">Giá bán</div>
                      <div className="mt-1 font-medium">{selected.price.toLocaleString("vi-VN")} đ</div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="text-xs uppercase text-muted-foreground">Số có thể bán</div>
                      <div className="mt-1 font-medium">
                        {getSellableQty(selected) === null
                          ? "—"
                          : getSellableQty(selected)?.toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selected.isActive ? "default" : "secondary"}>
                      {selected.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>

                    {selectedRecipePresence?.status === "missing" ? (
                      <Badge variant="destructive">CHƯA CÓ CÔNG THỨC</Badge>
                    ) : selectedRecipePresence?.status === "ready" ? (
                      <Badge variant="outline">ĐÃ CÓ CÔNG THỨC</Badge>
                    ) : selectedRecipePresence?.status === "error" ? (
                      <Badge variant="secondary">LỖI ĐỌC RECIPE</Badge>
                    ) : (
                      <Badge variant="secondary">ĐANG KIỂM TRA</Badge>
                    )}
                  </div>

                  <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    {getRecipeReason(selected, selectedRecipePresence)}
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
                <>
                  {selectedRecipePresence?.status === "missing" && (
                    <Alert>
                      <AlertDescription>
                        Món này chưa có công thức. Hãy thêm recipe line rồi bấm “Lưu công thức”.
                      </AlertDescription>
                    </Alert>
                  )}

                  {ingredientOptions.length === 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Chưa có nguyên liệu khả dụng để cấu hình recipe. Hãy tạo nguyên liệu trước.
                      </AlertDescription>
                    </Alert>
                  )}

                  <RecipeLinesEditor
                    key={`${selectedId}:${recipeQuery.dataUpdatedAt}`}
                    initialLines={initialLines}
                    ingredientOptions={ingredientOptions}
                    disabled={saveMutation.isPending}
                    onSave={async (lines) => {
                      if (!branchId || !selectedId) return;

                      try {
                        await saveMutation.mutateAsync({
                          branchId,
                          menuItemId: selectedId,
                          lines,
                        });

                        setFlash({
                          kind: "success",
                          message: `Đã lưu công thức cho ${selected.name}. Quay lại Menu Management để kiểm tra số có thể bán đã đổi đúng chưa.`,
                        });
                      } catch (error) {
                        setFlash({
                          kind: "error",
                          message: extractErrorMessage(error),
                        });
                      }
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
