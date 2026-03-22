import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { hasAnyPermission, hasPermission } from "../../../../shared/auth/permissions";
import { Alert, AlertDescription, AlertTitle } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { cn } from "../../../../shared/utils/cn";
import { usePayrollMutations } from "../hooks/usePayrollMutations";
import { usePayrollStaffDetailQuery } from "../hooks/usePayrollStaffDetailQuery";
import { usePayrollSummaryQuery } from "../hooks/usePayrollSummaryQuery";
import type {
  PayrollBonusEntryView,
  PayrollBonusType,
  PayrollProfileView,
  PayrollSalaryMode,
  PayrollSummaryRow,
} from "../services/payrollApi";
import {
  formatPayrollCurrency,
  formatPayrollDate,
  formatPayrollDateTime,
  formatPayrollMonthLabel,
  formatWorkedDuration,
  getBonusTypeLabel,
  getCurrentPayrollMonth,
  getDefaultBusinessDate,
  getSalaryModeLabel,
  getStaffRoleLabel,
} from "../utils/payrollDisplay";

const SALARY_MODE_OPTIONS: ReadonlyArray<{ value: PayrollSalaryMode; label: string }> = [
  { value: "MONTHLY", label: "Lương tháng" },
  { value: "HOURLY", label: "Lương giờ" },
  { value: "SHIFT", label: "Lương theo ca" },
];

const BONUS_TYPE_OPTIONS: ReadonlyArray<{ value: PayrollBonusType; label: string }> = [
  { value: "PERFORMANCE", label: "Thưởng hiệu suất" },
  { value: "ADJUSTMENT", label: "Điều chỉnh" },
  { value: "OTHER", label: "Khác" },
];

type ProfileDraft = {
  salaryMode: PayrollSalaryMode;
  baseMonthlyAmount: number;
  hourlyRateAmount: number;
  shiftRateMorning: number;
  shiftRateEvening: number;
  latePenaltyPerMinute: number;
  earlyLeavePenaltyPerMinute: number;
  absencePenaltyAmount: number;
  isActive: boolean;
  note: string;
  expectedVersion: number | null;
};

type BonusDraft = {
  businessDate: string;
  bonusType: PayrollBonusType;
  amount: number;
  note: string;
  expectedVersion: number | null;
  voidReason: string;
};

function buildProfileDraft(profile: PayrollProfileView | null): ProfileDraft {
  return {
    salaryMode: profile?.salaryMode ?? "MONTHLY",
    baseMonthlyAmount: profile?.baseMonthlyAmount ?? 0,
    hourlyRateAmount: profile?.hourlyRateAmount ?? 0,
    shiftRateMorning: profile?.shiftRateMorning ?? 0,
    shiftRateEvening: profile?.shiftRateEvening ?? 0,
    latePenaltyPerMinute: profile?.latePenaltyPerMinute ?? 0,
    earlyLeavePenaltyPerMinute: profile?.earlyLeavePenaltyPerMinute ?? 0,
    absencePenaltyAmount: profile?.absencePenaltyAmount ?? 0,
    isActive: profile?.isActive ?? true,
    note: profile?.note ?? "",
    expectedVersion: profile?.version ?? null,
  };
}

function buildBonusDraft(month: string, bonus?: PayrollBonusEntryView | null): BonusDraft {
  return {
    businessDate: bonus?.businessDate ?? getDefaultBusinessDate(month),
    bonusType: bonus?.bonusType ?? "PERFORMANCE",
    amount: bonus?.amount ?? 0,
    note: bonus?.note ?? "",
    expectedVersion: bonus?.version ?? null,
    voidReason: "",
  };
}

function sumTotals(rows: PayrollSummaryRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.gross += row.totals.grossAmount;
      acc.penalty += row.totals.penaltyAmount;
      acc.bonus += row.totals.bonusAmount;
      acc.net += row.totals.estimatedNetAmount;
      if (!row.profile?.isActive) acc.missingProfile += 1;
      return acc;
    },
    { gross: 0, penalty: 0, bonus: 0, net: 0, missingProfile: 0 },
  );
}

function statusBadgeClass(status: string) {
  return String(status).toUpperCase() === "ACTIVE"
    ? "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]"
    : "border-[#ead8c0] bg-[#fffaf4] text-[#7d5732]";
}

function PayrollStaffRow({
  row,
  selected,
  onSelect,
}: {
  row: PayrollSummaryRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition",
        selected
          ? "border-[#cf5b42] bg-[#fff5ef] shadow-[0_14px_28px_rgba(184,130,73,0.12)]"
          : "border-[#ead8c0] bg-white hover:border-[#d8b18a] hover:bg-[#fffaf4]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[#4e2916]">
            {row.staffName || row.username}
          </div>
          <div className="mt-1 text-sm text-[#8a684d]">
            @{row.username} • {getStaffRoleLabel(row.staffRole)}
          </div>
        </div>
        <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusBadgeClass(row.staffStatus))}>
          {row.staffStatus}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#6b4e36] sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.26em] text-[#b48b63]">Mode lương</div>
          <div className="mt-1">{getSalaryModeLabel(row.profile?.salaryMode)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.26em] text-[#b48b63]">Ngày công / ca</div>
          <div className="mt-1">
            {row.attendance.attendedShiftCount} ca • {formatWorkedDuration(row.attendance.workedMinutes)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8a684d]">
          <span className="font-medium text-[#5a2f17]">{formatPayrollCurrency(row.totals.estimatedNetAmount)}</span>
          {" "}ước tính
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] text-[#7d5732]">
            Thưởng {formatPayrollCurrency(row.totals.bonusAmount)}
          </Badge>
          {!row.profile?.isActive && (
            <Badge className="rounded-full border-[#f1b8b8] bg-[#fff1f1] text-[#a03f3f]">
              Chưa cấu hình
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function PayrollProfilePanel({
  profile,
  canManageProfiles,
  isBusy,
  errorMessage,
  onSave,
}: {
  profile: PayrollProfileView | null;
  canManageProfiles: boolean;
  isBusy: boolean;
  errorMessage?: string | null;
  onSave: (draft: ProfileDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => buildProfileDraft(profile));

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <Card className="border-[#ead8c0] bg-[#fffdf9] shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-[#5a2f17]">Policy lương</CardTitle>
        <CardDescription>
          {canManageProfiles
            ? "Admin có thể tùy chỉnh mode lương, mức cơ bản và toàn bộ penalty cho từng nhân sự."
            : "Branch manager chỉ xem policy hiện tại, không thay đổi cấu hình lương lõi."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Mode lương</span>
            <select
              value={draft.salaryMode}
              onChange={(e) => updateDraft("salaryMode", e.target.value as PayrollSalaryMode)}
              disabled={!canManageProfiles || isBusy}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {SALARY_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Trạng thái policy</span>
            <div className="flex h-10 items-center rounded-md border border-[#ead8c0] bg-[#fffaf4] px-3 text-sm text-[#6b4e36]">
              {draft.isActive ? "Đang áp dụng" : "Tạm tắt"}
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Lương tháng</span>
            <Input type="number" min="0" value={draft.baseMonthlyAmount} onChange={(e) => updateDraft("baseMonthlyAmount", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Lương giờ</span>
            <Input type="number" min="0" value={draft.hourlyRateAmount} onChange={(e) => updateDraft("hourlyRateAmount", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Phạt vắng</span>
            <Input type="number" min="0" value={draft.absencePenaltyAmount} onChange={(e) => updateDraft("absencePenaltyAmount", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Ca sáng</span>
            <Input type="number" min="0" value={draft.shiftRateMorning} onChange={(e) => updateDraft("shiftRateMorning", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Ca chiều</span>
            <Input type="number" min="0" value={draft.shiftRateEvening} onChange={(e) => updateDraft("shiftRateEvening", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Phạt / phút trễ</span>
            <Input type="number" min="0" value={draft.latePenaltyPerMinute} onChange={(e) => updateDraft("latePenaltyPerMinute", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#6f4728]">Phạt / phút về sớm</span>
            <Input type="number" min="0" value={draft.earlyLeavePenaltyPerMinute} onChange={(e) => updateDraft("earlyLeavePenaltyPerMinute", Number(e.target.value || 0))} disabled={!canManageProfiles || isBusy} />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[#ead8c0] bg-[#fffaf4] px-4 py-3 md:col-span-2 xl:col-span-2">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => updateDraft("isActive", e.target.checked)} disabled={!canManageProfiles || isBusy} />
            <span className="text-sm font-medium text-[#6f4728]">Kích hoạt policy cho nhân sự này</span>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#6f4728]">Ghi chú policy</span>
          <textarea
            rows={3}
            value={draft.note}
            onChange={(e) => updateDraft("note", e.target.value)}
            disabled={!canManageProfiles || isBusy}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            placeholder="Ví dụ: thử việc 2 tháng đầu, áp rate riêng."
          />
        </label>

        {canManageProfiles && (
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void onSave(draft)} disabled={isBusy} className="rounded-full bg-[#cf5b42] px-6 text-white hover:bg-[#bf4b31]">
              {isBusy ? "Đang lưu..." : "Lưu policy lương"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(buildProfileDraft(profile))} disabled={isBusy} className="rounded-full border-[#d9bb95] text-[#7b4b22] hover:bg-[#fff4e6]">
              Khôi phục
            </Button>
          </div>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollBonusPanel({
  month,
  bonuses,
  canManageBonuses,
  isBusy,
  errorMessage,
  onCreate,
  onUpdate,
  onVoid,
}: {
  month: string;
  bonuses: PayrollBonusEntryView[];
  canManageBonuses: boolean;
  isBusy: boolean;
  errorMessage?: string | null;
  onCreate: (draft: BonusDraft) => Promise<void>;
  onUpdate: (payrollBonusId: string, draft: BonusDraft) => Promise<void>;
  onVoid: (payrollBonusId: string, draft: BonusDraft) => Promise<void>;
}) {
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => buildBonusDraft(month));

  function updateDraft<K extends keyof BonusDraft>(key: K, value: BonusDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function startEditingBonus(bonus: PayrollBonusEntryView) {
    setEditingBonusId(bonus.payrollBonusId);
    setDraft(buildBonusDraft(month, bonus));
  }

  function resetDraft() {
    setEditingBonusId(null);
    setDraft(buildBonusDraft(month));
  }

  async function handleSubmit() {
    if (editingBonusId) await onUpdate(editingBonusId, draft);
    else await onCreate(draft);
    resetDraft();
  }

  async function handleVoid() {
    if (!editingBonusId) return;
    await onVoid(editingBonusId, draft);
    resetDraft();
  }

  return (
    <>
      <Card className="border-[#ead8c0] bg-[#fffdf9] shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-[#5a2f17]">Thưởng / điều chỉnh</CardTitle>
          <CardDescription>Branch manager có thể thêm thưởng nhân viên làm tốt hoặc điều chỉnh hợp lệ theo ngày.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManageBonuses ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#6f4728]">Ngày áp dụng</span>
                  <Input type="date" value={draft.businessDate} onChange={(e) => updateDraft("businessDate", e.target.value)} disabled={isBusy} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#6f4728]">Loại</span>
                  <select value={draft.bonusType} onChange={(e) => updateDraft("bonusType", e.target.value as PayrollBonusType)} disabled={isBusy} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60">
                    {BONUS_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#6f4728]">Số tiền</span>
                  <Input type="number" min="0" value={draft.amount} onChange={(e) => updateDraft("amount", Number(e.target.value || 0))} disabled={isBusy} />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#6f4728]">Lý do / ghi chú</span>
                <textarea
                  rows={3}
                  value={draft.note}
                  onChange={(e) => updateDraft("note", e.target.value)}
                  disabled={isBusy}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                  placeholder="Ví dụ: thưởng vì hỗ trợ ca đông cuối tuần, phản hồi khách tốt."
                />
              </label>

              {editingBonusId && (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#6f4728]">Lý do void / hủy</span>
                  <Input value={draft.voidReason} onChange={(e) => updateDraft("voidReason", e.target.value)} disabled={isBusy} placeholder="Bắt buộc khi hủy khoản thưởng đã chọn." />
                </label>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => void handleSubmit()} disabled={isBusy || draft.note.trim().length < 2 || draft.amount <= 0} className="rounded-full bg-[#cf5b42] px-6 text-white hover:bg-[#bf4b31]">
                  {editingBonusId ? "Cập nhật thưởng" : "Thêm thưởng / điều chỉnh"}
                </Button>
                <Button type="button" variant="outline" onClick={resetDraft} disabled={isBusy} className="rounded-full border-[#d9bb95] text-[#7b4b22] hover:bg-[#fff4e6]">
                  Làm mới form
                </Button>
                {editingBonusId && (
                  <Button type="button" variant="outline" onClick={() => void handleVoid()} disabled={isBusy || draft.voidReason.trim().length < 2} className="rounded-full border-[#e3b1b1] text-[#9b3e3e] hover:bg-[#fff3f3]">
                    Hủy khoản thưởng này
                  </Button>
                )}
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-8 text-[#8b6a50]">
              Tài khoản hiện tại chỉ có quyền xem bảng lương, chưa có quyền thêm thưởng / điều chỉnh.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#ead8c0] shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-[#5a2f17]">Lịch sử thưởng gần đây</CardTitle>
              <CardDescription>Các khoản thưởng / điều chỉnh của nhân sự trong tháng này.</CardDescription>
            </div>
            <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] px-3 py-1 text-[#7d5732]">{bonuses.length} khoản</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {bonuses.length ? (
            <div className="space-y-3">
              {bonuses.map((bonus) => (
                <div key={bonus.payrollBonusId} className="rounded-2xl border border-[#ead8c0] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[#4e2916]">
                        {getBonusTypeLabel(bonus.bonusType)} • {formatPayrollCurrency(bonus.amount)}
                      </div>
                      <div className="mt-1 text-sm text-[#7b5a3d]">
                        {formatPayrollDate(bonus.businessDate)} • tạo lúc {formatPayrollDateTime(bonus.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", bonus.isVoid ? "border-[#f1b8b8] bg-[#fff1f1] text-[#a03f3f]" : "border-[#bfd8b4] bg-[#eff9e8] text-[#44723b]")}>
                        {bonus.isVoid ? "Đã void" : "Hiệu lực"}
                      </Badge>
                      {canManageBonuses && !bonus.isVoid && (
                        <Button type="button" variant="outline" onClick={() => startEditingBonus(bonus)} className="h-8 rounded-full border-[#d9bb95] px-3 text-[#7b4b22] hover:bg-[#fff4e6]">
                          Sửa
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[#6b4e36]">
                    {bonus.note}
                    {bonus.voidReason && <div className="mt-2 text-[#a03f3f]">Lý do void: {bonus.voidReason}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-8 text-center text-[#8b6a50]">
              Chưa có khoản thưởng / điều chỉnh nào cho nhân sự này trong tháng.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function InternalPayrollPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (state) => state.session);

  const canRead = hasPermission(session, "payroll.read");
  const canManageProfiles = hasPermission(session, "payroll.manage");
  const canManageBonuses = hasAnyPermission(session, ["payroll.bonus.manage", "payroll.manage"]);
  const resolvedBranchId = String(branchId ?? "").trim();

  const [month, setMonth] = useState(getCurrentPayrollMonth());
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const summaryQuery = usePayrollSummaryQuery({
    branchId: resolvedBranchId,
    month,
    q: search,
    enabled: canRead && Boolean(resolvedBranchId),
  });

  const rows = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data]);
  const effectiveSelectedStaffId = useMemo(() => {
    if (!rows.length) return "";
    return rows.some((row) => row.staffId === selectedStaffId) ? selectedStaffId : rows[0]!.staffId;
  }, [rows, selectedStaffId]);

  const detailQuery = usePayrollStaffDetailQuery({
    branchId: resolvedBranchId,
    month,
    staffId: effectiveSelectedStaffId,
    enabled: canRead && Boolean(effectiveSelectedStaffId),
  });

  const detail = detailQuery.data;
  const kpi = useMemo(() => sumTotals(rows), [rows]);
  const selectedSummary = detail?.summary ?? rows.find((row) => row.staffId === effectiveSelectedStaffId) ?? null;

  const {
    upsertProfileMutation,
    createBonusMutation,
    updateBonusMutation,
    voidBonusMutation,
  } = usePayrollMutations();

  async function handleSaveProfile(draft: ProfileDraft) {
    if (!effectiveSelectedStaffId) return;
    await upsertProfileMutation.mutateAsync({
      staffId: effectiveSelectedStaffId,
      payload: {
        branchId: resolvedBranchId,
        salaryMode: draft.salaryMode,
        baseMonthlyAmount: draft.baseMonthlyAmount,
        hourlyRateAmount: draft.hourlyRateAmount,
        shiftRateMorning: draft.shiftRateMorning,
        shiftRateEvening: draft.shiftRateEvening,
        latePenaltyPerMinute: draft.latePenaltyPerMinute,
        earlyLeavePenaltyPerMinute: draft.earlyLeavePenaltyPerMinute,
        absencePenaltyAmount: draft.absencePenaltyAmount,
        isActive: draft.isActive,
        note: draft.note.trim() || null,
        expectedVersion: draft.expectedVersion,
      },
    });
  }

  async function handleCreateBonus(draft: BonusDraft) {
    if (!effectiveSelectedStaffId) return;
    await createBonusMutation.mutateAsync({
      staffId: effectiveSelectedStaffId,
      payload: {
        branchId: resolvedBranchId,
        businessDate: draft.businessDate,
        bonusType: draft.bonusType,
        amount: draft.amount,
        note: draft.note.trim(),
      },
    });
  }

  async function handleUpdateBonus(payrollBonusId: string, draft: BonusDraft) {
    await updateBonusMutation.mutateAsync({
      payrollBonusId,
      payload: {
        branchId: resolvedBranchId,
        businessDate: draft.businessDate,
        bonusType: draft.bonusType,
        amount: draft.amount,
        note: draft.note.trim(),
        expectedVersion: draft.expectedVersion,
      },
    });
  }

  async function handleVoidBonus(payrollBonusId: string, draft: BonusDraft) {
    await voidBonusMutation.mutateAsync({
      payrollBonusId,
      payload: {
        branchId: resolvedBranchId,
        reason: draft.voidReason.trim(),
        expectedVersion: draft.expectedVersion,
      },
    });
  }

  if (!canRead) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#4e2916]">Payroll Center</h1>
          <p className="mt-3 text-lg text-[#8b6a50]">Chi nhánh: {resolvedBranchId}</p>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Không đủ quyền</AlertTitle>
          <AlertDescription>
            Tài khoản hiện tại chưa có quyền xem dữ liệu tính lương (`payroll.read`).
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-[#e7d2b8] bg-[#fffaf4] shadow-[0_18px_40px_rgba(184,130,73,0.10)]">
        <CardContent className="flex flex-col gap-5 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.4em] text-[#b48b63]">Payroll Center</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#4e2916]">
              Tính lương & thưởng chi nhánh {resolvedBranchId}
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-[#8b6a50]">
              Admin setup công thức lương linh hoạt theo nhân sự. Branch manager thêm thưởng cho nhân viên làm tốt
              mà không phá policy lõi.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#6f4728]">Tháng tính lương</span>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#6f4728]">Tìm nhân sự</span>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tên, username, role..." />
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Nhân sự", value: rows.length, tone: "text-[#5a2f17]" },
          { label: "Gross", value: formatPayrollCurrency(kpi.gross), tone: "text-[#5a2f17]" },
          { label: "Phạt", value: formatPayrollCurrency(kpi.penalty), tone: "text-[#a14d38]" },
          { label: "Thưởng", value: formatPayrollCurrency(kpi.bonus), tone: "text-[#44723b]" },
          { label: "Net ước tính", value: formatPayrollCurrency(kpi.net), tone: "text-[#2f5d83]" },
        ].map((item) => (
          <Card key={item.label} className="border-[#ead8c0] bg-white shadow-[0_16px_32px_rgba(184,130,73,0.08)]">
            <CardContent className="p-6">
              <div className="text-sm text-[#8a684d]">{item.label}</div>
              <div className={cn("mt-3 text-3xl font-semibold tracking-tight", item.tone)}>{item.value}</div>
              {item.label === "Nhân sự" && kpi.missingProfile > 0 && (
                <div className="mt-2 text-xs text-[#a03f3f]">{kpi.missingProfile} nhân sự chưa có policy active</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {summaryQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Không tải được bảng tính lương</AlertTitle>
          <AlertDescription>{summaryQuery.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-[#ead8c0] shadow-[0_20px_40px_rgba(184,130,73,0.08)]">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-3xl text-[#5a2f17]">Nhân sự theo tháng</CardTitle>
                <CardDescription>{formatPayrollMonthLabel(month)} • {rows.length} nhân sự</CardDescription>
              </div>
              <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] px-4 py-1 text-[#7d5732]">{rows.length} dòng</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-10 text-center text-[#8b6a50]">
                Đang tải tổng hợp lương...
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#ead8c0] px-4 py-10 text-center text-[#8b6a50]">
                Không có nhân sự phù hợp trong tháng này.
              </div>
            ) : (
              <div className="max-h-[860px] space-y-4 overflow-y-auto pr-2">
                {rows.map((row) => (
                  <PayrollStaffRow key={row.staffId} row={row} selected={row.staffId === effectiveSelectedStaffId} onSelect={() => setSelectedStaffId(row.staffId)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[#ead8c0] shadow-[0_20px_40px_rgba(184,130,73,0.08)]">
            <CardHeader className="pb-4">
              <div className="text-sm uppercase tracking-[0.34em] text-[#b48b63]">Payroll Workbench</div>
              <CardTitle className="mt-3 text-3xl text-[#5a2f17]">
                {selectedSummary ? selectedSummary.staffName || selectedSummary.username : "Chọn một nhân sự để cấu hình"}
              </CardTitle>
              <CardDescription>
                {selectedSummary
                  ? `@${selectedSummary.username} • ${getStaffRoleLabel(selectedSummary.staffRole)} • ${formatPayrollMonthLabel(month)}`
                  : "Chọn một nhân sự ở bảng bên trái để xem attendance, policy lương và lịch sử thưởng."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedSummary ? (
                <div className="rounded-2xl border border-dashed border-[#ead8c0] px-5 py-10 text-[#8b6a50]">
                  Bảng bên trái dùng để quét nhanh tình hình lương. Workbench này gom policy và thưởng của một nhân sự vào một chỗ để thao tác ít nhầm hơn.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusBadgeClass(selectedSummary.staffStatus))}>
                      {selectedSummary.staffStatus}
                    </Badge>
                    <Badge className="rounded-full border-[#ead8c0] bg-[#fffaf4] px-3 py-1 text-[#7d5732]">
                      {getSalaryModeLabel(selectedSummary.profile?.salaryMode)}
                    </Badge>
                    {!selectedSummary.profile?.isActive && (
                      <Badge className="rounded-full border-[#f1b8b8] bg-[#fff1f1] px-3 py-1 text-[#a03f3f]">Chưa cấu hình policy</Badge>
                    )}
                    <Badge className="rounded-full border-[#cfe3f1] bg-[#f3f9fd] px-3 py-1 text-[#47739a]">
                      Cập nhật {formatPayrollDateTime(selectedSummary.updatedAt)}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#ead8c0] bg-[#fffaf4] p-4">
                      <div className="text-xs uppercase tracking-[0.26em] text-[#b48b63]">Attendance tháng</div>
                      <div className="mt-3 space-y-2 text-sm text-[#6b4e36]">
                        <div>Ngày công / ca: <span className="font-semibold text-[#4e2916]">{selectedSummary.attendance.attendedShiftCount} ca</span></div>
                        <div>Tổng giờ làm: <span className="font-semibold text-[#4e2916]">{formatWorkedDuration(selectedSummary.attendance.workedMinutes)}</span></div>
                        <div>Ca sáng / chiều: <span className="font-semibold text-[#4e2916]">{selectedSummary.attendance.morningShiftCount} / {selectedSummary.attendance.eveningShiftCount}</span></div>
                        <div>Đi trễ / về sớm: <span className="font-semibold text-[#4e2916]">{selectedSummary.attendance.lateMinutes} / {selectedSummary.attendance.earlyLeaveMinutes} phút</span></div>
                        <div>Vắng mặt: <span className="font-semibold text-[#4e2916]">{selectedSummary.attendance.absentCount}</span></div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#ead8c0] bg-[#fffaf4] p-4">
                      <div className="text-xs uppercase tracking-[0.26em] text-[#b48b63]">Kết quả tính lương</div>
                      <div className="mt-3 grid gap-3 text-sm text-[#6b4e36] sm:grid-cols-2">
                        <div><div className="text-xs uppercase tracking-[0.2em] text-[#b48b63]">Gross</div><div className="mt-1 font-semibold text-[#4e2916]">{formatPayrollCurrency(selectedSummary.totals.grossAmount)}</div></div>
                        <div><div className="text-xs uppercase tracking-[0.2em] text-[#b48b63]">Thưởng</div><div className="mt-1 font-semibold text-[#44723b]">{formatPayrollCurrency(selectedSummary.totals.bonusAmount)}</div></div>
                        <div><div className="text-xs uppercase tracking-[0.2em] text-[#b48b63]">Phạt</div><div className="mt-1 font-semibold text-[#a14d38]">{formatPayrollCurrency(selectedSummary.totals.penaltyAmount)}</div></div>
                        <div><div className="text-xs uppercase tracking-[0.2em] text-[#b48b63]">Net ước tính</div><div className="mt-1 font-semibold text-[#2f5d83]">{formatPayrollCurrency(selectedSummary.totals.estimatedNetAmount)}</div></div>
                      </div>
                    </div>
                  </div>

                  <PayrollProfilePanel
                    key={`${effectiveSelectedStaffId}:${detail?.summary.profile?.payrollProfileId ?? "new"}:${detail?.summary.profile?.version ?? 0}`}
                    profile={detail?.summary.profile ?? null}
                    canManageProfiles={canManageProfiles}
                    isBusy={upsertProfileMutation.isPending}
                    errorMessage={upsertProfileMutation.error?.message}
                    onSave={handleSaveProfile}
                  />

                  <PayrollBonusPanel
                    key={`${effectiveSelectedStaffId}:${month}`}
                    month={month}
                    bonuses={detail?.bonuses ?? []}
                    canManageBonuses={canManageBonuses}
                    isBusy={createBonusMutation.isPending || updateBonusMutation.isPending || voidBonusMutation.isPending}
                    errorMessage={createBonusMutation.error?.message ?? updateBonusMutation.error?.message ?? voidBonusMutation.error?.message}
                    onCreate={handleCreateBonus}
                    onUpdate={handleUpdateBonus}
                    onVoid={handleVoidBonus}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {detailQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Không tải được chi tiết nhân sự</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
