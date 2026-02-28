import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import { useAppQuery } from "../../../../shared/http/useAppQuery";
import { useAppMutation } from "../../../../shared/http/useAppMutation";
import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Label } from "../../../../shared/ui/label";
import { Input } from "../../../../shared/ui/input";
import { Button } from "../../../../shared/ui/button";
import { Badge } from "../../../../shared/ui/badge";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";

type StaffRole = "BRANCH_MANAGER" | "STAFF" | "KITCHEN" | "CASHIER";
type StaffStatus = "ACTIVE" | "DISABLED";

type StaffRow = {
  staffId: string;
  username: string;
  fullName: string | null;
  role: StaffRole;
  status: StaffStatus;
  branchId: string;
};

export function InternalAdminPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const session = useStore(authStore, (s) => s.session);
  const perms = session?.permissions ?? [];
  const role = String(session?.role ?? "").toUpperCase();

  const canRead = perms.includes("staff.read") || role === "ADMIN" || role === "BRANCH_MANAGER";
  const canManage = perms.includes("staff.manage") || role === "ADMIN";

  const branchParam = String(branchId ?? "").trim();

  const [statusFilter, setStatusFilter] = useState<"" | StaffStatus>("");
  const listKey = useMemo(
    () => ["admin", "staff", "list", { branchId: branchParam, status: statusFilter }] as const,
    [branchParam, statusFilter]
  );

  const listQuery = useAppQuery<{ items: StaffRow[] }>({
    queryKey: listKey,
    enabled: !!session && canRead && !!branchParam,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("branchId", branchParam);
      if (statusFilter) qs.set("status", statusFilter);
      return apiFetchAuthed<{ items: StaffRow[] }>(`/admin/staff?${qs.toString()}`);
    },
    staleTime: 5000,
  });

  // ---- Create staff (admin creates account) ----
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("STAFF");

  const createMutation = useAppMutation({
    invalidateKeys: [listKey as unknown as unknown[]],
    mutationFn: async () => {
      return apiFetchAuthed(`/admin/staff`, {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
          role: newRole,
          branchId: branchParam,
          fullName: fullName.trim() ? fullName.trim() : null,
        }),
      });
    },
    onSuccess: () => {
      setUsername("");
      setFullName("");
      setPassword("");
      setNewRole("STAFF");
    },
  });

  // ---- Update role/status/reset password ----
  const updateRoleMutation = useAppMutation({
    invalidateKeys: [listKey as unknown as unknown[]],
    mutationFn: async (v: { staffId: string; role: StaffRole }) => {
      return apiFetchAuthed(`/admin/staff/${encodeURIComponent(v.staffId)}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: v.role }),
      });
    },
  });

  const updateStatusMutation = useAppMutation({
    invalidateKeys: [listKey as unknown as unknown[]],
    mutationFn: async (v: { staffId: string; status: StaffStatus }) => {
      return apiFetchAuthed(`/admin/staff/${encodeURIComponent(v.staffId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: v.status }),
      });
    },
  });

  const resetPassMutation = useAppMutation({
    invalidateKeys: [listKey as unknown as unknown[]],
    mutationFn: async (v: { staffId: string; newPassword: string }) => {
      return apiFetchAuthed(`/admin/staff/${encodeURIComponent(v.staffId)}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: v.newPassword }),
      });
    },
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chi nhánh: <span className="font-mono">{branchParam || "—"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/i/${branchParam}/tables`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Tables
          </Link>
          <Link to={`/i/${branchParam}/kitchen`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            Kitchen
          </Link>
          <Link to={`/i/pos/menu`} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            POS
          </Link>
        </div>
      </div>

      {!canRead && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Không đủ quyền xem staff (cần <span className="font-mono">staff.read</span>).
        </div>
      )}

      {/* Create staff */}
      {canManage && (
        <section className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tạo tài khoản nhân viên</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="staff01" />
                </div>

                <div className="space-y-2">
                  <Label>Họ tên</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
                </div>

                <div className="space-y-2">
                  <Label>Mật khẩu tạm</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder=">= 4 ký tự" />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="KITCHEN">KITCHEN</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                  </select>
                </div>

                {createMutation.error && (
                  <div className="md:col-span-2">
                    <Alert variant="destructive">
                      <AlertDescription>
                        {createMutation.error.message}
                        {createMutation.error.correlationId && (
                          <span className="mt-1 block text-xs">Mã: {createMutation.error.correlationId}</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="md:col-span-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Đang tạo..." : "Tạo tài khoản"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Staff list */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Danh sách nhân viên</h2>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="">ALL</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            <Button variant="secondary" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
              {listQuery.isFetching ? "Đang tải..." : "Refresh"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {listQuery.isLoading && <div className="text-sm text-muted-foreground">Đang tải…</div>}
            {listQuery.error && (
              <div className="text-sm text-destructive">
                {listQuery.error.message}
                {listQuery.error.correlationId && <span className="ml-2 text-xs">({listQuery.error.correlationId})</span>}
              </div>
            )}

            {!listQuery.isLoading && !listQuery.error && (
              <div className="space-y-2">
                {(listQuery.data?.items ?? []).map((u) => {
                  const id = String(u.staffId);
                  const pending = updateRoleMutation.isPending || updateStatusMutation.isPending || resetPassMutation.isPending;

                  return (
                    <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <div className="font-medium">{u.fullName ?? u.username}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          user: <span className="font-mono">{u.username}</span> • role:{" "}
                          <span className="font-mono">{u.role}</span> • branch:{" "}
                          <span className="font-mono">{u.branchId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{u.status}</Badge>

                        {canManage && (
                          <>
                            <select
                              className="h-9 rounded-md border bg-background px-2 text-sm"
                              value={u.role}
                              disabled={pending}
                              onChange={(e) => updateRoleMutation.mutate({ staffId: id, role: e.target.value as StaffRole })}
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="KITCHEN">KITCHEN</option>
                              <option value="CASHIER">CASHIER</option>
                              <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                            </select>

                            <select
                              className="h-9 rounded-md border bg-background px-2 text-sm"
                              value={u.status}
                              disabled={pending}
                              onChange={(e) => updateStatusMutation.mutate({ staffId: id, status: e.target.value as StaffStatus })}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="DISABLED">DISABLED</option>
                            </select>

                            <Button
                              variant="outline"
                              disabled={pending}
                              onClick={() => {
                                const newPassword = prompt(`Đặt mật khẩu mới cho ${u.username} (>=4 ký tự):`);
                                if (!newPassword) return;
                                resetPassMutation.mutate({ staffId: id, newPassword });
                              }}
                            >
                              Reset mật khẩu
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(listQuery.data?.items ?? []).length === 0 && (
                  <div className="text-sm text-muted-foreground">Không có nhân viên.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}