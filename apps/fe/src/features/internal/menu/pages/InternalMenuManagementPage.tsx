import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import {
  isInternalBranchMismatch,
  resolveInternalBranch,
} from "../../../../shared/auth/permissions";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Skeleton } from "../../../../shared/ui/skeleton";

import {
  MenuCategoryForm,
  type MenuCategoryFormValues,
} from "../components/MenuCategoryForm";
import { MenuItemForm, type MenuItemFormValues } from "../components/MenuItemForm";
import { useAdminMenuItemsQuery } from "../hooks/useAdminMenuItemsQuery";
import { useCreateMenuCategoryMutation } from "../hooks/useCreateMenuCategoryMutation";
import { useDeleteMenuCategoryMutation } from "../hooks/useDeleteMenuCategoryMutation";
import { useCreateMenuItemMutation } from "../hooks/useCreateMenuItemMutation";
import {
  useMenuRecipePresenceMap,
  type MenuRecipePresenceSummary,
} from "../hooks/useMenuRecipePresenceMap";
import { useSetMenuItemActiveMutation } from "../hooks/useSetMenuItemActiveMutation";
import { useUpdateMenuCategoryMutation } from "../hooks/useUpdateMenuCategoryMutation";
import { useUpdateMenuItemMutation } from "../hooks/useUpdateMenuItemMutation";
import {
  fetchAdminMenuCategories,
  type AdminMenuCategory,
  type AdminMenuItem,
} from "../services/adminMenuApi";

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

type ActiveFilter = "all" | "active" | "inactive";
type AvailabilityFilter = "all" | "sellable" | "outOfStock" | "missingRecipe";

type DecoratedMenuRow = {
  item: AdminMenuItem;
  sellableQty: number | null;
  hasRecipe: boolean | null;
  isSellable: boolean;
  isOutOfStock: boolean;
  reasonText: string;
};

const EMPTY_FORM: MenuItemFormValues = {
  categoryId: "",
  name: "",
  price: "",
  description: "",
  imageUrl: "",
  isActive: true,
};

const EMPTY_CATEGORY_FORM: MenuCategoryFormValues = {
  name: "",
  sortOrder: "0",
  isActive: true,
};

function toFormValues(item: AdminMenuItem): MenuItemFormValues {
  return {
    categoryId: String(item.categoryId ?? ""),
    name: String(item.name ?? ""),
    price: Number(item.price ?? 0).toString(),
    description: String(item.description ?? ""),
    imageUrl: String(item.imageUrl ?? ""),
    isActive: Boolean(item.isActive),
  };
}

function toCategoryFormValues(category: AdminMenuCategory): MenuCategoryFormValues {
  return {
    name: String(category.name ?? ""),
    sortOrder: String(category.sortOrder ?? 0),
    isActive: Boolean(category.isActive ?? true),
  };
}

function extractErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Thao tác menu thất bại.";
}

function validateForm(values: MenuItemFormValues): string | null {
  if (!values.categoryId.trim()) return "Vui lòng chọn danh mục.";
  if (!values.name.trim()) return "Vui lòng nhập tên món.";
  if (values.name.trim().length > 120) return "Tên món tối đa 120 ký tự.";

  const price = Number(values.price);
  if (!Number.isFinite(price) || price < 0) {
    return "Giá món không hợp lệ.";
  }

  const imageUrl = values.imageUrl.trim();
  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "Image URL phải bắt đầu bằng http hoặc https.";
      }
    } catch {
      return "Image URL không hợp lệ.";
    }
  }

  return null;
}

function validateCategoryForm(values: MenuCategoryFormValues): string | null {
  if (!values.name.trim()) return "Vui lòng nhập tên danh mục.";
  if (values.name.trim().length > 80) return "Tên danh mục tối đa 80 ký tự.";

  const sortOrder = Number(values.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    return "Thứ tự hiển thị phải là số nguyên từ 0 đến 9999.";
  }

  return null;
}

function getSellableQty(item: AdminMenuItem): number | null {
  if (item.stockQty == null || !Number.isFinite(Number(item.stockQty))) {
    return null;
  }

  return Math.max(0, Number(item.stockQty));
}

function decorateMenuItem(
  item: AdminMenuItem,
  recipeSummary?: MenuRecipePresenceSummary,
): DecoratedMenuRow {
  const sellableQty = getSellableQty(item);
  const hasRecipe =
    recipeSummary?.status === "ready"
      ? true
      : recipeSummary?.status === "missing"
        ? false
        : null;

  const isSellable = Boolean(item.isActive) && sellableQty !== null && sellableQty > 0;
  const isOutOfStock = hasRecipe === true && (sellableQty ?? 0) <= 0;

  let reasonText = "Đang kiểm tra công thức.";

  if (!item.isActive) {
    reasonText = "Món đang inactive.";
  } else if (hasRecipe === false) {
    reasonText = "Chưa có công thức nên chưa tính được số có thể bán.";
  } else if (sellableQty === null) {
    reasonText = "Chưa đồng bộ được sellable qty.";
  } else if (sellableQty <= 0) {
    reasonText = "Thiếu nguyên liệu hoặc tồn kho hiện không đủ.";
  } else {
    reasonText = "Đủ nguyên liệu để bán.";
  }

  return {
    item,
    sellableQty,
    hasRecipe,
    isSellable,
    isOutOfStock,
    reasonText,
  };
}

export function InternalMenuManagementPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const navigate = useNavigate();
  const bid = resolveInternalBranch(session, branchId);
  const branchMismatch = isInternalBranchMismatch(session, branchId);

  const [flash, setFlash] = useState<FlashState>(null);
  const [categoryFlash, setCategoryFlash] = useState<FlashState>(null);
  const [createdItem, setCreatedItem] = useState<AdminMenuItem | null>(null);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [form, setForm] = useState<MenuItemFormValues>(EMPTY_FORM);
  const [categoryForm, setCategoryForm] = useState<MenuCategoryFormValues>(EMPTY_CATEGORY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const categoriesQuery = useAppQuery({
    queryKey: ["admin", "menu", "categories", { branchId: bid || undefined }] as const,
    queryFn: () => fetchAdminMenuCategories({ branchId: bid || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  const itemsQuery = useAdminMenuItemsQuery({
    branchId: bid || undefined,
    categoryId: categoryFilter || undefined,
    q: q.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    limit: 1000,
  });

  const createMutation = useCreateMenuItemMutation();
  const updateMutation = useUpdateMenuItemMutation();
  const setActiveMutation = useSetMenuItemActiveMutation();
  const createCategoryMutation = useCreateMenuCategoryMutation();
  const deleteCategoryMutation = useDeleteMenuCategoryMutation();
  const updateCategoryMutation = useUpdateMenuCategoryMutation();

  const categories = categoriesQuery.data ?? [];
  const rawRows = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);
  const recipePresenceQuery = useMenuRecipePresenceMap(
    bid || null,
    rawRows.map((item) => item.id),
  );

  const decoratedRows = useMemo(() => {
    const presenceMap = recipePresenceQuery.data ?? {};

    return rawRows
      .map((item) => decorateMenuItem(item, presenceMap[item.id]))
      .filter((row) => {
        switch (availabilityFilter) {
          case "sellable":
            return row.isSellable;
          case "outOfStock":
            return row.isOutOfStock;
          case "missingRecipe":
            return row.hasRecipe === false;
          case "all":
          default:
            return true;
        }
      });
  }, [availabilityFilter, rawRows, recipePresenceQuery.data]);

  const total = itemsQuery.data?.total ?? rawRows.length;
  const isSaving =
    createMutation.isPending || updateMutation.isPending || setActiveMutation.isPending;
  const isCategorySaving =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending;

  if (!session) {
    return <Navigate to="/i/login" replace />;
  }

  if (branchMismatch) {
    return <Navigate to={`/i/${String(session.branchId)}/admin/menu`} replace />;
  }

  const handleCreate = async () => {
    setFlash(null);

    const validationError = validateForm(form);
    if (validationError) {
      setFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        categoryId: form.categoryId.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        isActive: form.isActive,
      });

      setCreatedItem(created);
      setFlash({
        kind: "success",
        message: `Đã tạo món ${created.name}. Làm tiếp bước kế bên: cấu hình công thức để hệ thống tính số có thể bán.`,
      });
      setForm(EMPTY_FORM);
      setEditingItemId(null);
      await itemsQuery.refetch();
    } catch (error) {
      setCreatedItem(null);
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleUpdate = async () => {
    if (!editingItemId) return;

    setFlash(null);
    setCreatedItem(null);

    const validationError = validateForm(form);
    if (validationError) {
      setFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      const updated = await updateMutation.mutateAsync({
        itemId: editingItemId,
        categoryId: form.categoryId.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        isActive: form.isActive,
      });

      setFlash({
        kind: "success",
        message: `Đã cập nhật món ${updated.name}.`,
      });
      setEditingItemId(null);
      setForm(EMPTY_FORM);
      await itemsQuery.refetch();
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleToggleActive = async (item: AdminMenuItem) => {
    setFlash(null);
    setCreatedItem(null);

    try {
      const updated = await setActiveMutation.mutateAsync({
        itemId: item.id,
        isActive: !item.isActive,
      });

      setFlash({
        kind: "success",
        message: updated.isActive
          ? `Đã kích hoạt món ${updated.name}.`
          : `Đã ẩn món ${updated.name} khỏi menu khách hàng.`,
      });
      await itemsQuery.refetch();
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleCreateCategory = async () => {
    setCategoryFlash(null);

    const validationError = validateCategoryForm(categoryForm);
    if (validationError) {
      setCategoryFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      const created = await createCategoryMutation.mutateAsync({
        name: categoryForm.name.trim(),
        sortOrder: Number(categoryForm.sortOrder),
        isActive: categoryForm.isActive,
      });

      setCategoryFlash({
        kind: "success",
        message: `Đã tạo danh mục ${created.name}.`,
      });
      setCategoryForm(EMPTY_CATEGORY_FORM);
      setEditingCategoryId(null);
      await categoriesQuery.refetch();
    } catch (error) {
      setCategoryFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId) return;

    setCategoryFlash(null);

    const validationError = validateCategoryForm(categoryForm);
    if (validationError) {
      setCategoryFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      const updated = await updateCategoryMutation.mutateAsync({
        categoryId: editingCategoryId,
        name: categoryForm.name.trim(),
        sortOrder: Number(categoryForm.sortOrder),
        isActive: categoryForm.isActive,
      });

      setCategoryFlash({
        kind: "success",
        message: `Đã cập nhật danh mục ${updated.name}.`,
      });
      setEditingCategoryId(null);
      setCategoryForm(EMPTY_CATEGORY_FORM);
      await categoriesQuery.refetch();
    } catch (error) {
      setCategoryFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleToggleCategoryActive = async (category: AdminMenuCategory) => {
    setCategoryFlash(null);

    try {
      const updated = await updateCategoryMutation.mutateAsync({
        categoryId: category.id,
        isActive: !category.isActive,
      });

      setCategoryFlash({
        kind: "success",
        message: updated.isActive
          ? `Đã hiển thị lại danh mục ${updated.name}.`
          : `Đã ẩn danh mục ${updated.name}; các món bên trong cũng sẽ biến mất khỏi customer menu.`,
      });
      await categoriesQuery.refetch();
      await itemsQuery.refetch();
    } catch (error) {
      setCategoryFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleDeleteCategory = async (category: AdminMenuCategory) => {
    if (
      !window.confirm(
        `Xóa danh mục "${category.name}"? Chỉ nên làm việc này khi danh mục đã trống hoàn toàn.`,
      )
    ) {
      return;
    }

    setCategoryFlash(null);

    try {
      await deleteCategoryMutation.mutateAsync({
        categoryId: category.id,
      });

      setCategoryFlash({
        kind: "success",
        message: `Đã xóa danh mục ${category.name}.`,
      });

      if (editingCategoryId === category.id) {
        cancelCategoryEdit();
      }

      await categoriesQuery.refetch();
      await itemsQuery.refetch();
    } catch (error) {
      setCategoryFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const startEdit = (item: AdminMenuItem) => {
    setFlash(null);
    setCreatedItem(null);
    setEditingItemId(item.id);
    setForm(toFormValues(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditCategory = (category: AdminMenuCategory) => {
    setCategoryFlash(null);
    setEditingCategoryId(category.id);
    setCategoryForm(toCategoryFormValues(category));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setForm(EMPTY_FORM);
    setFlash(null);
    setCreatedItem(null);
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setCategoryFlash(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Can
        perm="menu.manage"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền truy cập Menu Management.
          </div>
        }
      >
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Menu Management</h1>
          <p className="text-sm text-muted-foreground">
            Tạo danh mục, thêm món, ẩn/hiện category và kiểm soát vì sao món đang bán được hoặc
            chưa bán được.
          </p>
        </section>

        {flash && (
          <Alert variant={flash.kind === "error" ? "destructive" : "default"}>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{flash.message}</span>

              {flash.kind === "success" && createdItem && branchId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/i/${branchId}/admin/inventory/recipes?itemId=${encodeURIComponent(
                        createdItem.id,
                      )}`,
                      {
                        state: {
                          preselectedItem: createdItem,
                        },
                      },
                    )
                  }
                >
                  Đi cấu hình công thức
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)] xl:items-start">
          <MenuItemForm
            title={editingItemId ? "Cập nhật món" : "Tạo món mới"}
            submitLabel={editingItemId ? "Lưu cập nhật" : "Tạo món"}
            values={form}
            categories={categories}
            disabled={isSaving || categoriesQuery.isLoading}
            errorMessage={null}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={() => {
              if (editingItemId) {
                void handleUpdate();
              } else {
                void handleCreate();
              }
            }}
            onCancel={editingItemId ? cancelEdit : undefined}
          />

          <div className="space-y-4 xl:grid xl:h-[760px] xl:grid-rows-[auto_minmax(0,1fr)] xl:gap-4 xl:space-y-0">
            {categoryFlash && (
              <Alert variant={categoryFlash.kind === "error" ? "destructive" : "default"}>
                <AlertDescription>{categoryFlash.message}</AlertDescription>
              </Alert>
            )}

            <MenuCategoryForm
              title={editingCategoryId ? "Cập nhật danh mục" : "Tạo danh mục mới"}
              submitLabel={editingCategoryId ? "Lưu danh mục" : "Tạo danh mục"}
              values={categoryForm}
              disabled={isCategorySaving}
              errorMessage={null}
              onChange={(patch) => setCategoryForm((prev) => ({ ...prev, ...patch }))}
              onSubmit={() => {
                if (editingCategoryId) {
                  void handleUpdateCategory();
                } else {
                  void handleCreateCategory();
                }
              }}
              onCancel={editingCategoryId ? cancelCategoryEdit : undefined}
            />

            <Card className="overflow-hidden xl:flex xl:min-h-0 xl:flex-col">
              <CardHeader>
                <CardTitle>Danh mục món</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 overflow-hidden xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
                {categoriesQuery.isLoading ? (
                  <div className="grid gap-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                    Chưa có danh mục nào. Hãy tạo ít nhất một danh mục trước khi thêm món mới.
                  </div>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1 xl:max-h-none">
                    {categories.map((category) => {
                      const itemCount = Number(category.itemCount ?? 0);
                      const activeItemCount = Number(category.activeItemCount ?? 0);

                      return (
                        <div
                          key={category.id}
                          className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{category.name}</span>
                                <Badge variant={category.isActive ? "default" : "secondary"}>
                                  {category.isActive ? "HIỂN THỊ" : "ĐÃ ẨN"}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Sort #{category.sortOrder ?? 0} • {itemCount} món • {activeItemCount}{" "}
                                món active
                              </div>
                              {!category.isActive && activeItemCount > 0 ? (
                                <div className="text-xs text-amber-700">
                                  Category này đang ẩn nên {activeItemCount} món active bên trong
                                  cũng sẽ bị ẩn khỏi menu khách.
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => startEditCategory(category)}
                              >
                                Sửa
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={category.isActive ? "outline" : "default"}
                                disabled={isCategorySaving}
                                onClick={() => void handleToggleCategoryActive(category)}
                              >
                                {category.isActive ? "Ẩn danh mục" : "Hiển thị lại"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isCategorySaving || itemCount > 0}
                                onClick={() => void handleDeleteCategory(category)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Danh sách món</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 xl:flex xl:max-h-[820px] xl:flex-col xl:overflow-hidden">
            <div className="grid gap-4 md:grid-cols-5">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên món..."
              />

              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isActive === false ? " (đã ẩn)" : ""}
                  </option>
                ))}
              </select>

              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã ẩn</option>
              </select>

              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
              >
                <option value="all">Tất cả khả năng bán</option>
                <option value="sellable">Có thể bán</option>
                <option value="outOfStock">Hết hàng</option>
                <option value="missingRecipe">Chưa có công thức</option>
              </select>

              <div className="flex items-center text-sm text-muted-foreground">
                Hiển thị{" "}
                <span className="mx-1 font-medium text-foreground">{decoratedRows.length}</span> /{" "}
                {total} món
              </div>
            </div>

            {recipePresenceQuery.isLoading && !itemsQuery.isLoading ? (
              <div className="text-xs text-muted-foreground">
                Đang kiểm tra trạng thái công thức cho danh sách món...
              </div>
            ) : null}

            {categoriesQuery.isLoading || itemsQuery.isLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : null}

            {(categoriesQuery.error || itemsQuery.error) && (
              <Alert variant="destructive">
                <AlertDescription>
                  {extractErrorMessage(categoriesQuery.error ?? itemsQuery.error)}
                </AlertDescription>
              </Alert>
            )}

            {!categoriesQuery.isLoading &&
            !itemsQuery.isLoading &&
            !itemsQuery.error &&
            decoratedRows.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                Không có món nào phù hợp bộ lọc hiện tại.
              </div>
            ) : null}

            {!categoriesQuery.isLoading && !itemsQuery.isLoading && decoratedRows.length > 0 ? (
              <div className="overflow-auto rounded-lg border xl:min-h-0 xl:flex-1">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-[1] bg-muted/95 backdrop-blur">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Tên món</th>
                      <th className="px-4 py-3 font-medium">Danh mục</th>
                      <th className="px-4 py-3 font-medium">Giá</th>
                      <th className="px-4 py-3 font-medium">Có thể bán</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium">Ảnh</th>
                      <th className="px-4 py-3 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decoratedRows.map((row) => {
                      const item = row.item;

                      return (
                        <tr key={item.id} className="border-t align-top">
                          <td className="px-4 py-3 font-mono text-xs">{item.id}</td>

                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="mt-1 max-w-[360px] text-xs text-muted-foreground line-clamp-2">
                              {item.description?.trim() || "Không có mô tả."}
                            </div>
                          </td>

                          <td className="px-4 py-3">{item.categoryName || item.categoryId}</td>

                          <td className="px-4 py-3">{item.price.toLocaleString("vi-VN")} đ</td>

                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {row.sellableQty === null
                                  ? "—"
                                  : row.sellableQty.toLocaleString("vi-VN")}
                              </div>
                              <div className="max-w-[260px] text-xs text-muted-foreground">
                                {row.reasonText}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={item.isActive ? "default" : "secondary"}>
                                {item.isActive ? "ACTIVE" : "INACTIVE"}
                              </Badge>

                              {row.hasRecipe === false ? (
                                <Badge variant="destructive">CHƯA CÓ CÔNG THỨC</Badge>
                              ) : row.hasRecipe === null ? (
                                <Badge variant="secondary">ĐANG KIỂM TRA</Badge>
                              ) : row.isOutOfStock ? (
                                <Badge variant="destructive">HẾT HÀNG</Badge>
                              ) : (
                                <Badge variant="outline">CÓ THỂ BÁN</Badge>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {item.imageUrl ? (
                              <a
                                href={item.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                Xem ảnh
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!branchId}
                                onClick={() => {
                                  if (!branchId) return;
                                  navigate(
                                    `/i/${branchId}/admin/inventory/recipes?itemId=${encodeURIComponent(
                                      item.id,
                                    )}`,
                                    {
                                      state: {
                                        preselectedItem: item,
                                      },
                                    },
                                  );
                                }}
                              >
                                Công thức
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => startEdit(item)}
                              >
                                Sửa
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant={item.isActive ? "outline" : "default"}
                                disabled={setActiveMutation.isPending}
                                onClick={() => void handleToggleActive(item)}
                              >
                                {item.isActive ? "Ẩn món" : "Kích hoạt"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
