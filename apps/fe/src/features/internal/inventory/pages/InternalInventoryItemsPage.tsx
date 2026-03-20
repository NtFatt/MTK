import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { useRealtimeRoom } from "../../../../shared/realtime";
import { realtimeConfig } from "../../../../shared/realtime/config";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { useAdjustInventoryItemMutation } from "../hooks/useAdjustInventoryItemMutation";
import { useCreateInventoryItemMutation } from "../hooks/useCreateInventoryItemMutation";
import { useInventoryItemsQuery } from "../hooks/useInventoryItemsQuery";
import { useUpdateInventoryItemMutation } from "../hooks/useUpdateInventoryItemMutation";

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

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

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

function extractErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Thao tác nguyên liệu thất bại.";
}

function parseNonNegativeNumber(value: string, fieldLabel: string): number {
  const n = Number(value.trim() || "0");
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldLabel} phải là số lớn hơn hoặc bằng 0.`);
  }
  return n;
}

function validateCreateForm(form: CreateIngredientForm): string | null {
  if (!form.ingredientCode.trim()) return "Vui lòng nhập mã nguyên liệu.";
  if (!form.ingredientName.trim()) return "Vui lòng nhập tên nguyên liệu.";
  if (!form.unit.trim()) return "Vui lòng nhập đơn vị.";

  try {
    parseNonNegativeNumber(form.currentQty, "Số lượng ban đầu");
    parseNonNegativeNumber(form.warningThreshold, "Ngưỡng cảnh báo");
    parseNonNegativeNumber(form.criticalThreshold, "Ngưỡng nguy cấp");
  } catch (error) {
    return extractErrorMessage(error);
  }

  return null;
}

function validateEditForm(form: EditIngredientForm): string | null {
  if (!form.ingredientName.trim()) return "Vui lòng nhập tên nguyên liệu.";
  if (!form.unit.trim()) return "Vui lòng nhập đơn vị.";

  try {
    parseNonNegativeNumber(form.warningThreshold, "Ngưỡng cảnh báo");
    parseNonNegativeNumber(form.criticalThreshold, "Ngưỡng nguy cấp");
  } catch (error) {
    return extractErrorMessage(error);
  }

  return null;
}

function validateAdjustForm(form: AdjustIngredientForm): string | null {
  const quantity = Number(form.quantity.trim());
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Số lượng điều chỉnh phải lớn hơn 0.";
  }

  return null;
}

export function InternalInventoryItemsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [flash, setFlash] = useState<FlashState>(null);
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
    branchParam ? `${realtimeConfig.internalInventoryRoomPrefix}:${branchParam}` : null,
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

  function resetCreateForm() {
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
    setFlash(null);
    setAdjustingId(null);
    setAdjustForm(EMPTY_ADJUST_FORM);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_EDIT_FORM);
  }

  function startAdjust(row: {
    id: string | number;
    ingredientName: string;
  }) {
    setFlash(null);
    setEditingId(null);
    setEditForm(EMPTY_EDIT_FORM);
    setAdjustingId(String(row.id));
    setAdjustForm({
      id: String(row.id),
      ingredientName: row.ingredientName,
      adjustmentType: "IN",
      quantity: "",
      reason: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelAdjust() {
    setAdjustingId(null);
    setAdjustForm(EMPTY_ADJUST_FORM);
  }

  async function onCreateIngredient() {
    if (!branchId) return;

    setFlash(null);
    const validationError = validateCreateForm(form);
    if (validationError) {
      setFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      await createMutation.mutateAsync({
        branchId,
        ingredientCode: form.ingredientCode.trim(),
        ingredientName: form.ingredientName.trim(),
        unit: form.unit.trim(),
        currentQty: parseNonNegativeNumber(form.currentQty, "Số lượng ban đầu"),
        warningThreshold: parseNonNegativeNumber(form.warningThreshold, "Ngưỡng cảnh báo"),
        criticalThreshold: parseNonNegativeNumber(form.criticalThreshold, "Ngưỡng nguy cấp"),
        isActive: true,
      });

      setFlash({
        kind: "success",
        message: `Đã tạo nguyên liệu ${form.ingredientName.trim()}.`,
      });
      resetCreateForm();
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  }

  async function onSaveEdit() {
    if (!branchId || !editingId) return;

    setFlash(null);
    const validationError = validateEditForm(editForm);
    if (validationError) {
      setFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        branchId,
        ingredientId: editingId,
        ingredientName: editForm.ingredientName.trim(),
        unit: editForm.unit.trim(),
        warningThreshold: parseNonNegativeNumber(editForm.warningThreshold, "Ngưỡng cảnh báo"),
        criticalThreshold: parseNonNegativeNumber(editForm.criticalThreshold, "Ngưỡng nguy cấp"),
        isActive: editForm.isActive,
      });

      setFlash({
        kind: "success",
        message: `Đã cập nhật metadata cho ${editForm.ingredientName.trim()}.`,
      });
      cancelEdit();
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  }

  async function onToggleActive(row: {
    id: string | number;
    ingredientName: string;
    unit: string;
    warningThreshold: number;
    criticalThreshold: number;
    isActive: boolean;
  }) {
    if (!branchId) return;

    setFlash(null);

    try {
      await updateMutation.mutateAsync({
        branchId,
        ingredientId: String(row.id),
        ingredientName: row.ingredientName,
        unit: row.unit,
        warningThreshold: row.warningThreshold,
        criticalThreshold: row.criticalThreshold,
        isActive: !row.isActive,
      });

      setFlash({
        kind: "success",
        message: !row.isActive
          ? `Đã kích hoạt nguyên liệu ${row.ingredientName}.`
          : `Đã ngừng nguyên liệu ${row.ingredientName}.`,
      });
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  }

  async function onSubmitAdjust() {
    if (!branchId || !adjustingId) return;

    setFlash(null);
    const validationError = validateAdjustForm(adjustForm);
    if (validationError) {
      setFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        branchId,
        ingredientId: adjustingId,
        adjustmentType: adjustForm.adjustmentType,
        quantity: Number(adjustForm.quantity.trim()),
        reason: adjustForm.reason.trim() || undefined,
      });

      setFlash({
        kind: "success",
        message: `Đã điều chỉnh tồn cho ${adjustForm.ingredientName}.`,
      });
      cancelAdjust();
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nguyên liệu</h1>
          <p className="text-sm text-muted-foreground">
            PR25 tách rõ hai việc: sửa metadata nguyên liệu và điều chỉnh tồn kho. Không gộp hai luồng này nữa.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? "Đóng form tạo" : "Thêm nguyên liệu"}
          </Button>
        </div>
      </div>

      {flash && (
        <Alert variant={flash.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{flash.message}</AlertDescription>
        </Alert>
      )}

      {itemsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Không tải được dữ liệu nguyên liệu.</AlertDescription>
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
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Mã nguyên liệu</Label>
                <Input
                  value={form.ingredientCode}
                  onChange={(e) => updateForm("ingredientCode", e.target.value)}
                  placeholder="Ví dụ: VN_BEEF"
                />
              </div>

              <div className="space-y-2">
                <Label>Tên nguyên liệu</Label>
                <Input
                  value={form.ingredientName}
                  onChange={(e) => updateForm("ingredientName", e.target.value)}
                  placeholder="Ví dụ: Bò Việt"
                />
              </div>

              <div className="space-y-2">
                <Label>Đơn vị</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => updateForm("unit", e.target.value)}
                  placeholder="Ví dụ: gram"
                />
              </div>

              <div className="space-y-2">
                <Label>Số lượng ban đầu</Label>
                <Input
                  value={form.currentQty}
                  onChange={(e) => updateForm("currentQty", e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>Ngưỡng cảnh báo</Label>
                <Input
                  value={form.warningThreshold}
                  onChange={(e) => updateForm("warningThreshold", e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>Ngưỡng nguy cấp</Label>
                <Input
                  value={form.criticalThreshold}
                  onChange={(e) => updateForm("criticalThreshold", e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void onCreateIngredient()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Đang lưu..." : "Lưu nguyên liệu"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetCreateForm}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sửa metadata nguyên liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Chỉ sửa tên, đơn vị, ngưỡng cảnh báo và trạng thái hoạt động. Không đổi tồn kho ở đây.
            </div>

            {!editingId ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                Chọn “Sửa metadata” ở bảng bên dưới để chỉnh thông tin nguyên liệu.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mã nguyên liệu</Label>
                    <Input value={editForm.ingredientCode} readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label>Tên nguyên liệu</Label>
                    <Input
                      value={editForm.ingredientName}
                      onChange={(e) => updateEditForm("ingredientName", e.target.value)}
                      placeholder="Tên nguyên liệu"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Đơn vị</Label>
                    <Input
                      value={editForm.unit}
                      onChange={(e) => updateEditForm("unit", e.target.value)}
                      placeholder="Đơn vị"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ngưỡng cảnh báo</Label>
                    <Input
                      value={editForm.warningThreshold}
                      onChange={(e) => updateEditForm("warningThreshold", e.target.value)}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Ngưỡng nguy cấp</Label>
                    <Input
                      value={editForm.criticalThreshold}
                      onChange={(e) => updateEditForm("criticalThreshold", e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => updateEditForm("isActive", e.target.checked)}
                  />
                  Đang hoạt động
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void onSaveEdit()}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Đang lưu..." : "Lưu metadata"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Điều chỉnh tồn kho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Chỉ dùng để tăng / giảm / set tồn. Không sửa tên, đơn vị hay ngưỡng ở đây.
            </div>

            {!adjustingId ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                Chọn “Điều chỉnh tồn” ở bảng bên dưới để mở đúng nguyên liệu cần thao tác.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-3 text-sm">
                  Đang điều chỉnh: <span className="font-medium">{adjustForm.ingredientName}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kiểu điều chỉnh</Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label>Số lượng</Label>
                    <Input
                      value={adjustForm.quantity}
                      onChange={(e) => updateAdjustForm("quantity", e.target.value)}
                      placeholder="Số lượng"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Lý do điều chỉnh</Label>
                    <Input
                      value={adjustForm.reason}
                      onChange={(e) => updateAdjustForm("reason", e.target.value)}
                      placeholder="Ví dụ: nhập kho, hao hụt, kiểm kê"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void onSubmitAdjust()}
                    disabled={adjustMutation.isPending}
                  >
                    {adjustMutation.isPending ? "Đang cập nhật..." : "Xác nhận điều chỉnh"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelAdjust}>
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
          ) : filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Không có nguyên liệu phù hợp bộ lọc.
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
                      <tr key={row.id} className="border-t align-top">
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
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => startEdit(row)}
                            >
                              Sửa metadata
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startAdjust(row)}
                            >
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
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
