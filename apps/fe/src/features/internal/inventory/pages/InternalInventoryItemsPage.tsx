import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { useInventoryItemsQuery } from "../hooks/useInventoryItemsQuery";
import { useCreateInventoryItemMutation } from "../hooks/useCreateInventoryItemMutation";
import { useUpdateInventoryItemMutation } from "../hooks/useUpdateInventoryItemMutation";
import { useAdjustInventoryItemMutation } from "../hooks/useAdjustInventoryItemMutation";

import { useStore } from "zustand";
import { authStore } from "../../../../shared/auth/authStore";
import { useRealtimeRoom } from "../../../../shared/realtime";

type CreateIngredientForm = {
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  currentQty: string;
  warningThreshold: string;
  criticalThreshold: string;
};

type EditIngredientForm = {
  id: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  warningThreshold: string;
  criticalThreshold: string;
  isActive: boolean;
};

type AdjustIngredientForm = {
  id: string;
  ingredientName: string;
  adjustmentType: "IN" | "OUT" | "SET" | "CORRECTION";
  quantity: string;
  reason: string;
};

const EMPTY_FORM: CreateIngredientForm = {
  ingredientCode: "",
  ingredientName: "",
  unit: "",
  currentQty: "",
  warningThreshold: "",
  criticalThreshold: "",
};

const EMPTY_EDIT_FORM: EditIngredientForm = {
  id: "",
  ingredientCode: "",
  ingredientName: "",
  unit: "",
  warningThreshold: "",
  criticalThreshold: "",
  isActive: true,
};

const EMPTY_ADJUST_FORM: AdjustIngredientForm = {
  id: "",
  ingredientName: "",
  adjustmentType: "IN",
  quantity: "",
  reason: "",
};

function stockTone(row: {
  currentQty: number;
  warningThreshold: number;
  criticalThreshold: number;
}) {
  if (row.currentQty <= row.criticalThreshold) {
    return {
      label: "Critical",
      className: "border-destructive/40 bg-destructive/10 text-destructive",
    };
  }
  if (row.currentQty <= row.warningThreshold) {
    return {
      label: "Warning",
      className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
    };
  }
  return {
    label: "Ổn định",
    className: undefined,
  };
}

export function InternalInventoryItemsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateIngredientForm>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditIngredientForm>(EMPTY_EDIT_FORM);

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustIngredientForm>(EMPTY_ADJUST_FORM);

  const itemsQuery = useInventoryItemsQuery(branchId ?? null);
  const createMutation = useCreateInventoryItemMutation(branchId ?? null);
  const updateMutation = useUpdateInventoryItemMutation(branchId ?? null);
  const adjustMutation = useAdjustInventoryItemMutation(branchId ?? null);

  const rows = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const filteredRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((row) => {
      return (
        row.ingredientCode.toLowerCase().includes(qq) ||
        row.ingredientName.toLowerCase().includes(qq) ||
        row.unit.toLowerCase().includes(qq)
      );
    });
  }, [q, rows]);

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((x) => x.isActive).length;
    const warning = rows.filter(
      (x) => x.currentQty <= x.warningThreshold && x.currentQty > x.criticalThreshold,
    ).length;
    const critical = rows.filter((x) => x.currentQty <= x.criticalThreshold).length;

    return { total, active, warning, critical };
  }, [rows]);

  const session = useStore(authStore, (s) => s.session);
  const branchParam = String(branchId ?? "").trim();

  useRealtimeRoom(
    branchParam ? `branch:${branchParam}` : null,
    !!session && !!branchParam,
    session
      ? {
        kind: "internal",
        userKey: session.user?.id ? String(session.user.id) : "internal",
        branchId: branchParam || (session.branchId != null ? String(session.branchId) : undefined),
        token: session.accessToken,
      }
      : undefined,
  );

  function updateForm<K extends keyof CreateIngredientForm>(key: K, value: CreateIngredientForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditForm<K extends keyof EditIngredientForm>(key: K, value: EditIngredientForm[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAdjustForm<K extends keyof AdjustIngredientForm>(
    key: K,
    value: AdjustIngredientForm[K],
  ) {
    setAdjustForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setShowCreate(false);
  }

  function startEdit(row: {
    id: string | number;
    ingredientCode: string;
    ingredientName: string;
    unit: string;
    warningThreshold: number;
    criticalThreshold: number;
    isActive: boolean;
  }) {
    setEditingId(String(row.id));
    setEditForm({
      id: String(row.id),
      ingredientCode: row.ingredientCode,
      ingredientName: row.ingredientName,
      unit: row.unit,
      warningThreshold: String(row.warningThreshold),
      criticalThreshold: String(row.criticalThreshold),
      isActive: row.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_EDIT_FORM);
  }

  function startAdjust(row: {
    id: string | number;
    ingredientName: string;
  }) {
    setAdjustingId(String(row.id));
    setAdjustForm({
      id: String(row.id),
      ingredientName: row.ingredientName,
      adjustmentType: "IN",
      quantity: "",
      reason: "",
    });
  }

  function cancelAdjust() {
    setAdjustingId(null);
    setAdjustForm(EMPTY_ADJUST_FORM);
  }

  async function onCreateIngredient() {
    if (!branchId) return;

    await createMutation.mutateAsync({
      branchId,
      ingredientCode: form.ingredientCode.trim(),
      ingredientName: form.ingredientName.trim(),
      unit: form.unit.trim(),
      currentQty: Number(form.currentQty || "0"),
      warningThreshold: Number(form.warningThreshold || "0"),
      criticalThreshold: Number(form.criticalThreshold || "0"),
      isActive: true,
    });

    resetForm();
  }

  async function onSaveEdit() {
    if (!branchId || !editingId) return;

    await updateMutation.mutateAsync({
      branchId,
      ingredientId: editingId,
      ingredientName: editForm.ingredientName.trim(),
      unit: editForm.unit.trim(),
      warningThreshold: Number(editForm.warningThreshold || "0"),
      criticalThreshold: Number(editForm.criticalThreshold || "0"),
      isActive: editForm.isActive,
    });

    cancelEdit();
  }

  async function onToggleActive(row: {
    id: string | number;
    ingredientCode: string;
    ingredientName: string;
    unit: string;
    warningThreshold: number;
    criticalThreshold: number;
    isActive: boolean;
  }) {
    if (!branchId) return;

    await updateMutation.mutateAsync({
      branchId,
      ingredientId: String(row.id),
      ingredientName: row.ingredientName,
      unit: row.unit,
      warningThreshold: row.warningThreshold,
      criticalThreshold: row.criticalThreshold,
      isActive: !row.isActive,
    });
  }

  async function onSubmitAdjust() {
    if (!branchId || !adjustingId) return;

    await adjustMutation.mutateAsync({
      branchId,
      ingredientId: adjustingId,
      adjustmentType: adjustForm.adjustmentType,
      quantity: Number(adjustForm.quantity || "0"),
      reason: adjustForm.reason.trim() || undefined,
    });

    cancelAdjust();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nguyên liệu</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý tồn kho nguyên liệu theo chi nhánh, ngưỡng cảnh báo và trạng thái hoạt động.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? "Đóng form" : "Thêm nguyên liệu"}
          </Button>
        </div>
      </div>

      {(itemsQuery.isError ||
        createMutation.isError ||
        updateMutation.isError ||
        adjustMutation.isError) && (
          <Alert>
            <AlertDescription>
              Không thao tác được với dữ liệu nguyên liệu. Kiểm tra lại API hoặc quyền truy cập.
            </AlertDescription>
          </Alert>
        )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tổng nguyên liệu</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Đang hoạt động</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.active}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mức cảnh báo</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.warning}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mức nguy cấp</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.critical}</CardContent>
        </Card>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo nguyên liệu mới</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input value={form.ingredientCode} onChange={(e) => updateForm("ingredientCode", e.target.value)} placeholder="Mã nguyên liệu" />
            <Input value={form.ingredientName} onChange={(e) => updateForm("ingredientName", e.target.value)} placeholder="Tên nguyên liệu" />
            <Input value={form.unit} onChange={(e) => updateForm("unit", e.target.value)} placeholder="Đơn vị" />
            <Input value={form.currentQty} onChange={(e) => updateForm("currentQty", e.target.value)} placeholder="Số lượng ban đầu" inputMode="decimal" />
            <Input value={form.warningThreshold} onChange={(e) => updateForm("warningThreshold", e.target.value)} placeholder="Ngưỡng cảnh báo" inputMode="decimal" />
            <Input value={form.criticalThreshold} onChange={(e) => updateForm("criticalThreshold", e.target.value)} placeholder="Ngưỡng nguy cấp" inputMode="decimal" />

            <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-2">
              <Button type="button" onClick={onCreateIngredient} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Đang lưu..." : "Lưu nguyên liệu"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle>Sửa nguyên liệu</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input
              value={editForm.ingredientCode}
              readOnly
              placeholder="Mã nguyên liệu"
            />            <Input value={editForm.ingredientName} onChange={(e) => updateEditForm("ingredientName", e.target.value)} placeholder="Tên nguyên liệu" />
            <Input value={editForm.unit} onChange={(e) => updateEditForm("unit", e.target.value)} placeholder="Đơn vị" />
            <Input value={editForm.warningThreshold} onChange={(e) => updateEditForm("warningThreshold", e.target.value)} placeholder="Ngưỡng cảnh báo" inputMode="decimal" />
            <Input value={editForm.criticalThreshold} onChange={(e) => updateEditForm("criticalThreshold", e.target.value)} placeholder="Ngưỡng nguy cấp" inputMode="decimal" />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => updateEditForm("isActive", e.target.checked)}
              />
              Đang hoạt động
            </label>

            <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-2">
              <Button type="button" onClick={onSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {adjustingId && (
        <Card>
          <CardHeader>
            <CardTitle>Điều chỉnh tồn — {adjustForm.ingredientName}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={adjustForm.adjustmentType}
              onChange={(e) =>
                updateAdjustForm(
                  "adjustmentType",
                  e.target.value as AdjustIngredientForm["adjustmentType"],
                )
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="SET">SET</option>
              <option value="CORRECTION">CORRECTION</option>
            </select>

            <Input
              value={adjustForm.quantity}
              onChange={(e) => updateAdjustForm("quantity", e.target.value)}
              placeholder="Số lượng"
              inputMode="decimal"
            />

            <Input
              value={adjustForm.reason}
              onChange={(e) => updateAdjustForm("reason", e.target.value)}
              placeholder="Lý do điều chỉnh"
              className="xl:col-span-2"
            />

            <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-2">
              <Button type="button" onClick={onSubmitAdjust} disabled={adjustMutation.isPending}>
                {adjustMutation.isPending ? "Đang cập nhật..." : "Xác nhận điều chỉnh"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelAdjust}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách nguyên liệu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã, tên hoặc đơn vị..."
              className="md:max-w-sm"
            />

            <div className="text-sm text-muted-foreground">
              Hiển thị <span className="font-medium text-foreground">{filteredRows.length}</span> / {rows.length} nguyên liệu
            </div>
          </div>

          {itemsQuery.isLoading ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground">
              Đang tải dữ liệu nguyên liệu...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Mã</th>
                    <th className="px-4 py-3 font-medium">Tên nguyên liệu</th>
                    <th className="px-4 py-3 font-medium">Đơn vị</th>
                    <th className="px-4 py-3 font-medium">Tồn hiện tại</th>
                    <th className="px-4 py-3 font-medium">Ngưỡng cảnh báo</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const tone = stockTone(row);

                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.ingredientCode}</td>
                        <td className="px-4 py-3 font-medium">{row.ingredientName}</td>
                        <td className="px-4 py-3">{row.unit}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{row.currentQty}</span>
                            <Badge className={tone.className}>{tone.label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          warning {row.warningThreshold} / critical {row.criticalThreshold}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={row.isActive ? "default" : "secondary"}>
                            {row.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(row)}>
                              Sửa
                            </Button>

                            <Button type="button" size="sm" variant="outline" onClick={() => startAdjust(row)}>
                              Điều chỉnh tồn
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant={row.isActive ? "outline" : "default"}
                              disabled={updateMutation.isPending}
                              onClick={() => void onToggleActive(row)}
                            >
                              {row.isActive ? "Ngừng" : "Kích hoạt"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        Không có nguyên liệu phù hợp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}