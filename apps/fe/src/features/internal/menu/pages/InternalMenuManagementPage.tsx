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

import { MenuItemForm, type MenuItemFormValues } from "../components/MenuItemForm";
import { useAdminMenuItemsQuery } from "../hooks/useAdminMenuItemsQuery";
import { useCreateMenuItemMutation } from "../hooks/useCreateMenuItemMutation";
import { useMenuRecipePresenceMap, type MenuRecipePresenceSummary } from "../hooks/useMenuRecipePresenceMap";
import { useSetMenuItemActiveMutation } from "../hooks/useSetMenuItemActiveMutation";
import { useUpdateMenuItemMutation } from "../hooks/useUpdateMenuItemMutation";
import {
  fetchAdminMenuCategories,
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
  const [createdItem, setCreatedItem] = useState<AdminMenuItem | null>(null);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [form, setForm] = useState<MenuItemFormValues>(EMPTY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const startEdit = (item: AdminMenuItem) => {
    setFlash(null);
    setCreatedItem(null);
    setEditingItemId(item.id);
    setForm(toFormValues(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setForm(EMPTY_FORM);
    setFlash(null);
    setCreatedItem(null);
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
            Tạo, sửa và ẩn/hiện món. PR25 bổ sung trạng thái công thức, filter còn hàng/hết hàng và giải thích vì sao món đang không bán được.
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
                      `/i/${branchId}/admin/inventory/recipes?itemId=${encodeURIComponent(createdItem.id)}`,
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

        <Card>
          <CardHeader>
            <CardTitle>Danh sách món</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
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
                Hiển thị <span className="mx-1 font-medium text-foreground">{decoratedRows.length}</span> / {total} món
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

            {!categoriesQuery.isLoading && !itemsQuery.isLoading && !itemsQuery.error && decoratedRows.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                Không có món nào phù hợp bộ lọc hiện tại.
              </div>
            )}

            {!categoriesQuery.isLoading && !itemsQuery.isLoading && decoratedRows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
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
                                {row.sellableQty === null ? "—" : row.sellableQty.toLocaleString("vi-VN")}
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
                                    `/i/${branchId}/admin/inventory/recipes?itemId=${encodeURIComponent(item.id)}`,
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
            )}
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}
