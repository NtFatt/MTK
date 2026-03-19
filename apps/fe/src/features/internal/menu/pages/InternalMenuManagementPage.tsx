import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
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

export function InternalMenuManagementPage() {
    const session = useStore(authStore, (s) => s.session);
    const { branchId } = useParams<{ branchId: string }>();

    const bid = resolveInternalBranch(session, branchId);
    const branchMismatch = isInternalBranchMismatch(session, branchId);

    const [flash, setFlash] = useState<FlashState>(null);
    const [q, setQ] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
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
    });

    const createMutation = useCreateMenuItemMutation();
    const updateMutation = useUpdateMenuItemMutation();
    const setActiveMutation = useSetMenuItemActiveMutation();

    const categories = categoriesQuery.data ?? [];
    const rows = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data]);
    const total = itemsQuery.data?.total ?? rows.length;
    const isSaving = createMutation.isPending || updateMutation.isPending || setActiveMutation.isPending;
    const adminCrudReady = true;
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

            setFlash({
                kind: "success",
                message: `Đã tạo món ${created.name}.`,
            });

            setForm(EMPTY_FORM);
            setEditingItemId(null);
            await itemsQuery.refetch();
        } catch (error) {
            setFlash({ kind: "error", message: extractErrorMessage(error) });
        }
    };

    const handleUpdate = async () => {
        if (!editingItemId) return;

        setFlash(null);

        if (!adminCrudReady) {
            setFlash({
                kind: "error",
                message: "Cập nhật món chưa sẵn sàng vì backend admin menu chưa hoàn tất.",
            });
            return;
        }

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

        if (!adminCrudReady) {
            setFlash({
                kind: "error",
                message: "Ẩn/hiện món chưa sẵn sàng vì backend admin menu chưa hoàn tất.",
            });
            return;
        }

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
        setEditingItemId(item.id);
        setForm(toFormValues(item));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelEdit = () => {
        setEditingItemId(null);
        setForm(EMPTY_FORM);
        setFlash(null);
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
                        Tạo, sửa và ẩn/hiện món mà không cần chạm tay vào database.
                    </p>
                </section>

                {flash && (
                    <Alert variant={flash.kind === "error" ? "destructive" : "default"}>
                        <AlertDescription>{flash.message}</AlertDescription>
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
                        <div className="grid gap-4 md:grid-cols-4">
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

                            <div className="flex items-center text-sm text-muted-foreground">
                                Hiển thị <span className="mx-1 font-medium text-foreground">{rows.length}</span> / {total} món
                            </div>
                        </div>

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

                        {!categoriesQuery.isLoading && !itemsQuery.isLoading && !itemsQuery.error && rows.length === 0 && (
                            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                                Không có món nào phù hợp bộ lọc hiện tại.
                            </div>
                        )}

                        {!categoriesQuery.isLoading && !itemsQuery.isLoading && rows.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-muted/40">
                                        <tr className="text-left">
                                            <th className="px-4 py-3 font-medium">ID</th>
                                            <th className="px-4 py-3 font-medium">Tên món</th>
                                            <th className="px-4 py-3 font-medium">Danh mục</th>
                                            <th className="px-4 py-3 font-medium">Giá</th>
                                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                                            <th className="px-4 py-3 font-medium">Ảnh</th>
                                            <th className="px-4 py-3 font-medium">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((item) => (
                                            <tr key={item.id} className="border-t align-top">
                                                <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="mt-1 max-w-[340px] text-xs text-muted-foreground line-clamp-2">
                                                        {item.description?.trim() || "Không có mô tả."}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{item.categoryName || item.categoryId}</td>
                                                <td className="px-4 py-3">{item.price.toLocaleString("vi-VN")}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={item.isActive ? "default" : "secondary"}>
                                                        {item.isActive ? "ACTIVE" : "INACTIVE"}
                                                    </Badge>
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
                                                        <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(item)}>
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
                                        ))}
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
