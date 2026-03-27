import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type SVGProps,
} from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";
import { authStore } from "../../../../../shared/auth/authStore";
import {
  hasPermission,
  isInternalBranchMismatch,
  resolveInternalBranch,
} from "../../../../../shared/auth/permissions";
import {
  subscribeRealtime,
  useRealtimeRoom,
  type EventEnvelope,
} from "../../../../../shared/realtime";
import { realtimeConfig } from "../../../../../shared/realtime/config";
import { Alert, AlertDescription, AlertTitle } from "../../../../../shared/ui/alert";
import { Badge } from "../../../../../shared/ui/badge";
import { Button } from "../../../../../shared/ui/button";
import { Card, CardContent } from "../../../../../shared/ui/card";
import { Input } from "../../../../../shared/ui/input";
import { Label } from "../../../../../shared/ui/label";
import { useOpsTablesQuery } from "../hooks/useOpsTablesQuery";
import { useTableSetupMutations } from "../hooks/useTableSetupMutations";
import type { OpsTableDto } from "../services/opsTablesApi";

type IconProps = SVGProps<SVGSVGElement>;

const Icons = {
  Plus: (props: IconProps) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Edit2: (props: IconProps) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  Trash2: (props: IconProps) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  ),
  LayoutGrid: (props: IconProps) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  X: (props: IconProps) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
};

type FormState = {
  code: string;
  seats: number;
  areaName: string;
};

function extractBranchIdFromRealtime(env: EventEnvelope): string | null {
  const scope =
    env.scope && typeof env.scope === "object"
      ? (env.scope as Record<string, unknown>)
      : null;
  const payload =
    env.payload && typeof env.payload === "object"
      ? (env.payload as Record<string, unknown>)
      : null;

  const raw = scope?.branchId ?? scope?.branch_id ?? payload?.branchId ?? payload?.branch_id;
  return raw != null && String(raw).trim() ? String(raw).trim() : null;
}

function isTableSetupRealtimeEvent(env: EventEnvelope, branchId: string): boolean {
  if (!branchId) return false;
  if (env.room.startsWith(`ops:${branchId}`) && env.type === "table.setup.changed") return true;
  return env.type === "table.setup.changed" && extractBranchIdFromRealtime(env) === branchId;
}

function getDeleteBlockReason(table: OpsTableDto): string | null {
  if (table.sessionKey) return "Bàn vẫn đang có phiên phục vụ mở.";
  if ((table.unpaidOrdersCount ?? 0) > 0) return "Bàn vẫn còn đơn chưa thanh toán.";
  if ((table.activeOrdersCount ?? 0) > 0) return "Bàn vẫn còn đơn đang được xử lý.";
  if (table.status === "OCCUPIED") return "Bàn đang có khách.";
  if (table.status === "RESERVED") return "Bàn đang được giữ chỗ.";
  return null;
}

function emptyFormState(): FormState {
  return {
    code: "",
    seats: 4,
    areaName: "",
  };
}

export function InternalTableSetupPage() {
  const session = useStore(authStore, (state) => state.session);
  const { branchId: urlBranchId } = useParams<{ branchId: string }>();

  const resolvedBranchId = resolveInternalBranch(session, urlBranchId);
  const branchKey = Number.isFinite(Number(resolvedBranchId))
    ? Number(resolvedBranchId)
    : resolvedBranchId;

  const canManageTables = hasPermission(session, "ops.tables.manage");
  const isBranchMismatch = isInternalBranchMismatch(session, urlBranchId);
  const enabled = Boolean(session && resolvedBranchId && !isBranchMismatch && canManageTables);

  const { data: rawTables = [], isLoading, error, refetch, isFetching } = useOpsTablesQuery(
    branchKey,
    enabled,
  );
  const { createRecord, updateRecord, deleteRecord, feedback, clearFeedback } = useTableSetupMutations();

  const room = resolvedBranchId
    ? `${realtimeConfig.internalOpsRoomPrefix}:${resolvedBranchId}`
    : null;

  useRealtimeRoom(
    room,
    enabled && Boolean(room),
    session
      ? {
          kind: "internal",
          userKey: session.user?.id ? String(session.user.id) : "internal",
          branchId: branchKey ?? undefined,
          token: session.accessToken,
        }
      : undefined,
  );

  useEffect(() => {
    if (!enabled || !resolvedBranchId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeRealtime((env) => {
      if (!isTableSetupRealtimeEvent(env, String(resolvedBranchId))) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refetch();
      }, 60);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, resolvedBranchId, refetch]);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<OpsTableDto | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyFormState);

  const allAreas = useMemo(() => {
    const areas = new Set<string>();
    for (const table of rawTables) {
      if (table.area) areas.add(table.area);
    }
    return Array.from(areas).sort((left, right) => left.localeCompare(right));
  }, [rawTables]);

  const filteredTables = useMemo(() => {
    if (!search.trim()) return rawTables;
    const keyword = search.trim().toLowerCase();
    return rawTables.filter((table) =>
      [table.code, table.area ?? "", table.status]
        .map((value) => value.toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [rawTables, search]);

  const groupedTables = useMemo(() => {
    const groups: Record<string, OpsTableDto[]> = {};
    for (const table of filteredTables) {
      const area = table.area?.trim() || "Khu vực khác (Chưa phân loại)";
      if (!groups[area]) groups[area] = [];
      groups[area].push(table);
    }
    return groups;
  }, [filteredTables]);

  const sortedAreas = useMemo(
    () => Object.keys(groupedTables).sort((left, right) => left.localeCompare(right)),
    [groupedTables],
  );

  const openCreateModal = () => {
    clearFeedback();
    setEditingTable(null);
    setFormData(emptyFormState());
    setIsModalOpen(true);
  };

  const openEditModal = (table: OpsTableDto) => {
    clearFeedback();
    setEditingTable(table);
    setFormData({
      code: table.code,
      seats: table.seats,
      areaName: table.area ?? "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (table: OpsTableDto) => {
    if (!resolvedBranchId) return;
    const blockReason = getDeleteBlockReason(table);
    if (blockReason) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bàn [${table.code}] không?`)) return;

    deleteRecord.mutate({
      branchId: resolvedBranchId,
      tableId: table.id,
      code: table.code,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resolvedBranchId) return;

    const payload = {
      branchId: resolvedBranchId,
      code: formData.code,
      seats: formData.seats,
      areaName: formData.areaName || null,
    };

    if (editingTable) {
      updateRecord.mutate(
        { tableId: editingTable.id, payload },
        {
          onSuccess: () => setIsModalOpen(false),
        },
      );
      return;
    }

    createRecord.mutate(payload, {
      onSuccess: () => setIsModalOpen(false),
    });
  };

  if (isBranchMismatch) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Alert variant="destructive">
          <AlertTitle>Không thể truy cập cấu hình bàn</AlertTitle>
          <AlertDescription>Bạn không được phép thao tác trên chi nhánh khác.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canManageTables) {
    if (hasPermission(session, "ops.tables.read") && resolvedBranchId) {
      return <Navigate to={`/i/${resolvedBranchId}/tables`} replace />;
    }

    return (
      <div className="mx-auto max-w-3xl p-6">
        <Alert variant="destructive">
          <AlertTitle>Không có quyền truy cập</AlertTitle>
          <AlertDescription>Bạn cần quyền quản trị sơ đồ bàn để dùng màn hình này.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#fdfaf6] p-4 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-[#4e2916]">
              <span className="rounded-xl bg-[#ead8c0] p-2">
                <Icons.LayoutGrid className="h-6 w-6 text-[#7a5a43]" />
              </span>
              Quản lý sơ đồ bàn
            </h1>
            <p className="mt-1 font-medium text-[#9f7751]">
              Thiết lập khu vực, sức chứa và giữ cho sơ đồ vận hành luôn nhất quán.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="text"
              placeholder="Tìm theo mã bàn, khu vực..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border-[#dcc5a7] bg-white px-4 shadow-[0_2px_10px_rgba(139,103,71,0.05)] focus-visible:ring-[#cb9a6a] sm:w-72"
            />

            <Button
              onClick={openCreateModal}
              disabled={createRecord.isPending}
              className="rounded-full bg-[#cb9a6a] px-6 text-white hover:bg-[#b58455] shadow-[0_4px_14px_rgba(203,154,106,0.3)]"
            >
              <Icons.Plus className="mr-2 h-4 w-4" />
              Tạo bàn mới
            </Button>
          </div>
        </div>

        {feedback ? (
          <Alert variant={feedback.variant}>
            <AlertTitle>{feedback.title}</AlertTitle>
            <AlertDescription>
              {feedback.message}
              {feedback.correlationId ? (
                <span className="mt-1 block text-xs opacity-80">Mã lỗi: {feedback.correlationId}</span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Không thể tải sơ đồ bàn</AlertTitle>
            <AlertDescription>
              Dữ liệu cấu hình bàn hiện chưa tải được. Hãy thử làm mới hoặc kiểm tra backend.
            </AlertDescription>
          </Alert>
        ) : null}

        {isFetching && !isLoading ? (
          <div className="text-sm text-[#9f7751]">Đang đồng bộ dữ liệu mới nhất...</div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-[#f0e2cf] bg-white/70">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#cb9a6a] border-r-transparent" />
          </div>
        ) : sortedAreas.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dcc5a7] bg-white/60 p-12 text-center">
            <Icons.LayoutGrid className="mb-4 h-16 w-16 text-[#e8dbcd]" />
            <h3 className="text-xl font-bold text-[#4e2916]">Chưa có dữ liệu bàn</h3>
            <p className="mt-2 max-w-sm text-[#9f7751]">
              Chi nhánh này chưa được cấu hình bàn. Tạo bàn đầu tiên để bắt đầu thiết lập sơ đồ.
            </p>
            <Button
              onClick={openCreateModal}
              className="mt-6 rounded-full bg-[#4e2916] text-[#fdfaf6] hover:bg-[#31190d]"
            >
              Tạo bàn đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-10 pb-8">
            {sortedAreas.map((area) => (
              <section key={area} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="rounded-r-full border-l-4 border-[#cb9a6a] bg-gradient-to-r from-[#f5ebd9] to-transparent px-4 py-1 text-xl font-bold text-[#4e2916]">
                    {area}
                  </h2>
                  <Badge variant="outline" className="border-[#e8dbcd] bg-white text-xs text-[#9f7751]">
                    {groupedTables[area].length} bàn
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {groupedTables[area].map((table) => {
                    const deleteBlockReason = getDeleteBlockReason(table);
                    const isDeleteDisabled = Boolean(deleteBlockReason) || deleteRecord.isPending;
                    const isMutatingThisTable =
                      updateRecord.isPending &&
                      updateRecord.variables?.tableId === table.id;

                    return (
                      <Card
                        key={table.id}
                        className="group relative overflow-hidden rounded-[20px] border-none bg-white shadow-[0_4px_20px_-4px_rgba(92,64,44,0.08)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(92,64,44,0.15)]"
                      >
                        <div className="absolute top-0 h-1 w-full origin-left scale-x-0 rounded-t-[20px] bg-[#cb9a6a] transition-transform group-hover:scale-x-100" />
                        <CardContent className="p-5">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="flex flex-col">
                              <span className="mb-1 text-sm font-semibold text-[#9f7751]">BÀN</span>
                              <span className="text-2xl font-black leading-none text-[#4e2916]">{table.code}</span>
                            </div>

                            <Badge
                              variant="secondary"
                              className={[
                                table.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "",
                                table.status === "OCCUPIED" ? "bg-orange-100 text-orange-700" : "",
                                table.status === "RESERVED" ? "bg-blue-100 text-blue-700" : "",
                                table.status === "OUT_OF_SERVICE" ? "bg-slate-100 text-slate-700" : "",
                              ].join(" ")}
                            >
                              {table.status}
                            </Badge>
                          </div>

                          <div className="mb-3 rounded-xl border border-[#f5ebd9] bg-[#fdfaf6] px-3 py-2 text-sm text-[#7a5a43]">
                            <span className="mr-2 font-medium">Sức chứa:</span>
                            <span className="font-bold">{table.seats} người</span>
                          </div>

                          {table.directionId ? (
                            <div className="mb-2 text-xs text-[#9f7751]">
                              Direction: <span className="font-mono text-[#7a5a43]">{table.directionId}</span>
                            </div>
                          ) : null}

                          {(table.activeOrdersCount ?? 0) > 0 || (table.unpaidOrdersCount ?? 0) > 0 ? (
                            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              {(table.unpaidOrdersCount ?? 0) > 0
                                ? `Có ${table.unpaidOrdersCount} đơn chưa thanh toán.`
                                : `Có ${table.activeOrdersCount} đơn đang được xử lý.`}
                            </div>
                          ) : null}

                          <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl border-[#dcc5a7] text-[#4e2916] hover:bg-[#f5ebd9]"
                              onClick={() => openEditModal(table)}
                              disabled={isMutatingThisTable}
                            >
                              <Icons.Edit2 className="mr-1.5 h-3.5 w-3.5" />
                              {isMutatingThisTable ? "Đang lưu..." : "Sửa"}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-red-100 text-red-600 hover:border-red-200 hover:bg-red-50"
                              onClick={() => handleDelete(table)}
                              disabled={isDeleteDisabled}
                              title={deleteBlockReason ?? "Xóa bàn"}
                            >
                              <Icons.Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4e2916]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f5ebd9] bg-[linear-gradient(180deg,#fffaf4_0%,#fff_100%)] p-6">
              <h2 className="text-xl font-bold text-[#4e2916]">
                {editingTable ? "Sửa cấu hình bàn" : "Thiết lập bàn mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-[#9f7751] transition-colors hover:bg-[#f5ebd9]"
                type="button"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="font-semibold text-[#7a5a43]">Tên / số bàn *</Label>
                <Input
                  id="code"
                  required
                  value={formData.code}
                  onChange={(event) => setFormData((current) => ({ ...current, code: event.target.value }))}
                  placeholder="VD: VIP-01, T1-05..."
                  className="h-11 rounded-xl border-[#dcc5a7] focus-visible:ring-[#cb9a6a]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaName" className="font-semibold text-[#7a5a43]">Khu vực</Label>
                <Input
                  id="areaName"
                  value={formData.areaName}
                  onChange={(event) => setFormData((current) => ({ ...current, areaName: event.target.value }))}
                  placeholder="VD: Tầng 1, Ban công, VIP..."
                  className="h-11 rounded-xl border-[#dcc5a7] focus-visible:ring-[#cb9a6a]"
                  list="table-setup-areas"
                />
                <datalist id="table-setup-areas">
                  {allAreas.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats" className="font-semibold text-[#7a5a43]">Sức chứa *</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  required
                  value={formData.seats}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      seats: Math.max(1, Number(event.target.value || 1)),
                    }))
                  }
                  className="h-11 rounded-xl border-[#dcc5a7] focus-visible:ring-[#cb9a6a]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-[#dcc5a7] text-[#7a5a43]"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={createRecord.isPending || updateRecord.isPending}
                  className="h-11 flex-1 rounded-xl bg-[#4e2916] text-[#fdfaf6] shadow-md hover:bg-[#31190d]"
                >
                  {createRecord.isPending || updateRecord.isPending
                    ? "Đang xử lý..."
                    : editingTable
                      ? "Lưu thay đổi"
                      : "Tạo bàn"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
