import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import {
  isInternalBranchMismatch,
  resolveInternalBranch,
} from "../../../../shared/auth/permissions";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Skeleton } from "../../../../shared/ui/skeleton";

import {
  createAdminVoucher,
  fetchAdminVouchers,
  setAdminVoucherActive,
  updateAdminVoucher,
  type AdminVoucher,
  type UpsertAdminVoucherPayload,
} from "../services/adminVoucherApi";

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

type VoucherFormState = {
  code: string;
  name: string;
  description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: string;
  maxDiscountAmount: string;
  minSubtotal: string;
  usageLimitTotal: string;
  usageLimitPerSession: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY_FORM: VoucherFormState = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  maxDiscountAmount: "",
  minSubtotal: "0",
  usageLimitTotal: "",
  usageLimitPerSession: "1",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function vouchersQueryKey(branchId: string, q: string, includeInactive: boolean) {
  return ["admin", "vouchers", { branchId, q, includeInactive }] as const;
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function extractErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Thao tác voucher thất bại.";
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Thời gian áp dụng không hợp lệ.");
  return date.toISOString();
}

function parseNullableNumber(value: string, field: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} không hợp lệ.`);
  }
  return parsed;
}

function parseRequiredNumber(value: string, field: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} không hợp lệ.`);
  }
  return parsed;
}

function validateForm(form: VoucherFormState): string | null {
  if (!form.code.trim()) return "Vui lòng nhập mã voucher.";
  if (!form.name.trim()) return "Vui lòng nhập tên voucher.";

  try {
    parseRequiredNumber(form.discountValue, "Giá trị giảm");
    parseRequiredNumber(form.minSubtotal, "Đơn tối thiểu");
    parseNullableNumber(form.maxDiscountAmount, "Giảm tối đa");
    parseNullableNumber(form.usageLimitTotal, "Giới hạn tổng");
    parseNullableNumber(form.usageLimitPerSession, "Giới hạn mỗi phiên");

    const startsAt = normalizeDateTimeInput(form.startsAt);
    const endsAt = normalizeDateTimeInput(form.endsAt);
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return "Thời gian kết thúc phải sau thời gian bắt đầu.";
    }

    if (form.discountType === "PERCENT") {
      const percent = parseRequiredNumber(form.discountValue, "Phần trăm giảm");
      if (percent <= 0 || percent > 100) return "Voucher phần trăm phải nằm trong khoảng 0-100%.";
    }
  } catch (error) {
    return extractErrorMessage(error);
  }

  return null;
}

function formFromVoucher(voucher: AdminVoucher): VoucherFormState {
  return {
    code: voucher.code,
    name: voucher.name,
    description: voucher.description ?? "",
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    maxDiscountAmount: voucher.maxDiscountAmount != null ? String(voucher.maxDiscountAmount) : "",
    minSubtotal: String(voucher.minSubtotal),
    usageLimitTotal: voucher.usageLimitTotal != null ? String(voucher.usageLimitTotal) : "",
    usageLimitPerSession:
      voucher.usageLimitPerSession != null ? String(voucher.usageLimitPerSession) : "",
    startsAt: toLocalInputValue(voucher.startsAt),
    endsAt: toLocalInputValue(voucher.endsAt),
    isActive: voucher.isActive,
  };
}

function toPayload(branchId: string, form: VoucherFormState): UpsertAdminVoucherPayload {
  return {
    branchId,
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    discountType: form.discountType,
    discountValue: parseRequiredNumber(form.discountValue, "Giá trị giảm"),
    maxDiscountAmount: parseNullableNumber(form.maxDiscountAmount, "Giảm tối đa"),
    minSubtotal: parseRequiredNumber(form.minSubtotal, "Đơn tối thiểu"),
    usageLimitTotal: parseNullableNumber(form.usageLimitTotal, "Giới hạn tổng"),
    usageLimitPerSession: parseNullableNumber(form.usageLimitPerSession, "Giới hạn mỗi phiên"),
    startsAt: normalizeDateTimeInput(form.startsAt),
    endsAt: normalizeDateTimeInput(form.endsAt),
    isActive: form.isActive,
  };
}

function getLifecycle(voucher: AdminVoucher) {
  const now = Date.now();
  const startsAt = new Date(voucher.startsAt).getTime();
  const endsAt = new Date(voucher.endsAt).getTime();

  if (!voucher.isActive) {
    return { label: "Tạm ngưng", variant: "secondary" as const };
  }
  if (now < startsAt) {
    return { label: "Sắp mở", variant: "outline" as const };
  }
  if (now > endsAt) {
    return { label: "Hết hạn", variant: "destructive" as const };
  }
  return { label: "Đang chạy", variant: "default" as const };
}

export function InternalVoucherManagementPage() {
  const session = useStore(authStore, (state) => state.session);
  const { branchId } = useParams<{ branchId: string }>();
  const bid = resolveInternalBranch(session, branchId);
  const branchMismatch = isInternalBranchMismatch(session, branchId);

  const [flash, setFlash] = useState<FlashState>(null);
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [form, setForm] = useState<VoucherFormState>(EMPTY_FORM);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

  const vouchersQuery = useAppQuery({
    queryKey: vouchersQueryKey(bid || "", q, includeInactive),
    enabled: !!bid,
    queryFn: () => fetchAdminVouchers({ branchId: bid!, q: q.trim(), includeInactive }),
    staleTime: 30 * 1000,
  });

  const createMutation = useAppMutation({
    mutationFn: (payload: UpsertAdminVoucherPayload) => createAdminVoucher(payload),
    invalidateKeys: bid ? [[...vouchersQueryKey(bid, q, includeInactive)]] : [],
  });
  const updateMutation = useAppMutation({
    mutationFn: (input: { voucherId: string; payload: Partial<UpsertAdminVoucherPayload> & { branchId: string } }) =>
      updateAdminVoucher(input.voucherId, input.payload),
    invalidateKeys: bid ? [[...vouchersQueryKey(bid, q, includeInactive)]] : [],
  });
  const setActiveMutation = useAppMutation({
    mutationFn: (input: { voucherId: string; branchId: string; isActive: boolean }) =>
      setAdminVoucherActive(input),
    invalidateKeys: bid ? [[...vouchersQueryKey(bid, q, includeInactive)]] : [],
  });

  const rows = useMemo(() => vouchersQuery.data ?? [], [vouchersQuery.data]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, voucher) => {
        const lifecycle = getLifecycle(voucher).label;
        acc.total += 1;
        acc.usage += voucher.usageCount;
        if (lifecycle === "Đang chạy") acc.live += 1;
        if (lifecycle === "Sắp mở") acc.upcoming += 1;
        if (lifecycle === "Hết hạn") acc.expired += 1;
        return acc;
      },
      { total: 0, live: 0, upcoming: 0, expired: 0, usage: 0 },
    );
  }, [rows]);

  if (!session) {
    return <Navigate to="/i/login" replace />;
  }

  if (branchMismatch) {
    return <Navigate to={`/i/${String(session.branchId)}/admin/vouchers`} replace />;
  }

  const resetForm = () => {
    setEditingVoucherId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!bid) return;

    setFlash(null);
    const validationError = validateForm(form);
    if (validationError) {
      setFlash({ kind: "error", message: validationError });
      return;
    }

    try {
      const payload = toPayload(bid, form);
      if (editingVoucherId) {
        const updated = await updateMutation.mutateAsync({
          voucherId: editingVoucherId,
          payload,
        });
        setFlash({ kind: "success", message: `Đã cập nhật voucher ${updated.code}.` });
      } else {
        const created = await createMutation.mutateAsync(payload);
        setFlash({ kind: "success", message: `Đã tạo voucher ${created.code}.` });
      }
      resetForm();
      await vouchersQuery.refetch();
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  const handleToggleActive = async (voucher: AdminVoucher) => {
    if (!bid) return;
    setFlash(null);
    try {
      const updated = await setActiveMutation.mutateAsync({
        voucherId: voucher.id,
        branchId: bid,
        isActive: !voucher.isActive,
      });
      setFlash({
        kind: "success",
        message: updated.isActive
          ? `Đã kích hoạt voucher ${updated.code}.`
          : `Đã tạm ngưng voucher ${updated.code}.`,
      });
    } catch (error) {
      setFlash({ kind: "error", message: extractErrorMessage(error) });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Can
        perm="promotions.manage"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền truy cập Voucher Management.
          </div>
        }
      >
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Voucher Management</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý mã giảm giá theo chi nhánh, gồm lịch chạy, giới hạn sử dụng và điều kiện tối thiểu để customer áp dụng ngay trong cart / checkout.
          </p>
        </section>

        {flash ? (
          <Alert variant={flash.kind === "error" ? "destructive" : "default"}>
            <AlertDescription>{flash.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tổng voucher</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Đang chạy</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{summary.live}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sắp mở</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{summary.upcoming}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lượt đã dùng</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{summary.usage}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingVoucherId ? "Cập nhật voucher" : "Tạo voucher mới"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Mã voucher</Label>
                <Input
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  placeholder="HOTPOT10"
                />
              </div>

              <div className="space-y-2">
                <Label>Tên voucher</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Giảm 10% nồi lẩu"
                />
              </div>

              <div className="space-y-2">
                <Label>Kiểu giảm</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.discountType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discountType: event.target.value as VoucherFormState["discountType"],
                    }))
                  }
                >
                  <option value="PERCENT">Phần trăm</option>
                  <option value="FIXED_AMOUNT">Số tiền cố định</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Giá trị giảm</Label>
                <Input
                  value={form.discountValue}
                  onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                  placeholder={form.discountType === "PERCENT" ? "10" : "50000"}
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>Giảm tối đa</Label>
                <Input
                  value={form.maxDiscountAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))}
                  placeholder="Để trống nếu không giới hạn"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>Đơn tối thiểu</Label>
                <Input
                  value={form.minSubtotal}
                  onChange={(event) => setForm((prev) => ({ ...prev, minSubtotal: event.target.value }))}
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>Giới hạn tổng</Label>
                <Input
                  value={form.usageLimitTotal}
                  onChange={(event) => setForm((prev) => ({ ...prev, usageLimitTotal: event.target.value }))}
                  placeholder="Để trống nếu không giới hạn"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label>Giới hạn mỗi phiên</Label>
                <Input
                  value={form.usageLimitPerSession}
                  onChange={(event) => setForm((prev) => ({ ...prev, usageLimitPerSession: event.target.value }))}
                  placeholder="1"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label>Bắt đầu áp dụng</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                />
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label>Kết thúc áp dụng</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                />
              </div>

              <div className="space-y-2 xl:col-span-4">
                <Label>Mô tả</Label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Hiển thị ngắn gọn cho customer trên phiếu voucher."
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Kích hoạt ngay sau khi lưu
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingVoucherId
                  ? updateMutation.isPending
                    ? "Đang lưu..."
                    : "Lưu cập nhật"
                  : createMutation.isPending
                    ? "Đang tạo..."
                    : "Tạo voucher"}
              </Button>
              {editingVoucherId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Hủy chỉnh sửa
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách voucher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Tìm theo mã hoặc tên voucher..."
              />

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                Hiện cả voucher tạm ngưng
              </label>

              <div className="text-sm text-muted-foreground">
                Hiển thị <span className="font-medium text-foreground">{rows.length}</span> voucher
              </div>
            </div>

            {vouchersQuery.isLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : null}

            {vouchersQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>{extractErrorMessage(vouchersQuery.error)}</AlertDescription>
              </Alert>
            ) : null}

            {!vouchersQuery.isLoading && !vouchersQuery.error && rows.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                Chưa có voucher nào cho chi nhánh này.
              </div>
            ) : null}

            {!vouchersQuery.isLoading && rows.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Tên</th>
                      <th className="px-4 py-3 font-medium">Ưu đãi</th>
                      <th className="px-4 py-3 font-medium">Điều kiện</th>
                      <th className="px-4 py-3 font-medium">Lịch chạy</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((voucher) => {
                      const lifecycle = getLifecycle(voucher);

                      return (
                        <tr key={voucher.id} className="border-t align-top">
                          <td className="px-4 py-3 font-mono text-xs">{voucher.code}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{voucher.name}</div>
                            <div className="mt-1 max-w-[280px] text-xs text-muted-foreground">
                              {voucher.description?.trim() || "Không có mô tả."}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {voucher.discountType === "PERCENT"
                                ? `${voucher.discountValue}%`
                                : formatVnd(voucher.discountValue)}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Max: {voucher.maxDiscountAmount != null ? formatVnd(voucher.maxDiscountAmount) : "Không giới hạn"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">Đơn tối thiểu: {formatVnd(voucher.minSubtotal)}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Tổng lượt: {voucher.usageLimitTotal ?? "∞"} | Mỗi phiên: {voucher.usageLimitPerSession ?? "∞"}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">Đã dùng: {voucher.usageCount}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{new Date(voucher.startsAt).toLocaleString("vi-VN")}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              đến {new Date(voucher.endsAt).toLocaleString("vi-VN")}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
                              <Badge variant={voucher.isActive ? "outline" : "secondary"}>
                                {voucher.isActive ? "ACTIVE" : "INACTIVE"}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setFlash(null);
                                  setEditingVoucherId(voucher.id);
                                  setForm(formFromVoucher(voucher));
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                              >
                                Sửa
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant={voucher.isActive ? "outline" : "default"}
                                disabled={setActiveMutation.isPending}
                                onClick={() => void handleToggleActive(voucher)}
                              >
                                {voucher.isActive ? "Tạm ngưng" : "Kích hoạt"}
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
