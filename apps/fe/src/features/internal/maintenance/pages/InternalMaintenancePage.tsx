import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "zustand";

import { authStore } from "../../../../shared/auth/authStore";
import { Can } from "../../../../shared/auth/guards";
import {
  hasPermission,
  isInternalBranchMismatch,
  resolveInternalBranch,
} from "../../../../shared/auth/permissions";

import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";

import { useRunMaintenanceMutation } from "../hooks/useRunMaintenanceMutation";
import { useSyncTableStatusMutation } from "../hooks/useSyncTableStatusMutation";
import type { MaintenanceResult } from "../services/maintenanceApi";

type FlashState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

function extractErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Thao tác thất bại.";
}

export function InternalMaintenancePage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const bid = resolveInternalBranch(session, branchId);
  const branchMismatch = isInternalBranchMismatch(session, branchId);
  const canRun = hasPermission(session, "maintenance.run");

  const [lockAheadMinutes, setLockAheadMinutes] = useState(30);
  const [noShowGraceMinutes, setNoShowGraceMinutes] = useState(15);
  const [sessionStaleMinutes, setSessionStaleMinutes] = useState(120);
  const [flash, setFlash] = useState<FlashState>(null);
  const [lastOutput, setLastOutput] = useState<MaintenanceResult | null>(null);

  const runMut = useRunMaintenanceMutation(bid);
  const syncMut = useSyncTableStatusMutation(bid);

  if (!session) {
    return <Navigate to="/i/login" replace />;
  }

  if (!bid) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  if (branchMismatch) {
    return <Navigate to={`/i/${String(session.branchId)}/maintenance`} replace />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Can
        perm="maintenance.run"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền truy cập Maintenance.
          </div>
        }
      >
        {flash && (
          <Alert
            className={
              flash.kind === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : undefined
            }
          >
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{flash.message}</span>
              <Button variant="secondary" type="button" onClick={() => setFlash(null)}>
                Ẩn
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Lock ahead minutes</Label>
              <Input
                type="number"
                min={0}
                value={lockAheadMinutes}
                onChange={(e) => setLockAheadMinutes(Number(e.target.value || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label>No-show grace minutes</Label>
              <Input
                type="number"
                min={0}
                value={noShowGraceMinutes}
                onChange={(e) => setNoShowGraceMinutes(Number(e.target.value || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label>Session stale minutes</Label>
              <Input
                type="number"
                min={0}
                value={sessionStaleMinutes}
                onChange={(e) => setSessionStaleMinutes(Number(e.target.value || 0))}
              />
            </div>

            <div className="md:col-span-3 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!canRun || runMut.isPending || syncMut.isPending}
                onClick={() => {
                  setFlash(null);
                  runMut.mutate(
                    {
                      branchId: bid,
                      lockAheadMinutes,
                      noShowGraceMinutes,
                      sessionStaleMinutes,
                    },
                    {
                      onSuccess: (out: MaintenanceResult) => {
                        setLastOutput(out);
                        setFlash({
                          kind: "success",
                          message: "Run maintenance thành công.",
                        });
                      },
                      onError: (error: unknown) => {
                        setFlash({
                          kind: "error",
                          message: extractErrorMessage(error),
                        });
                      },
                    },
                  );
                }}
              >
                {runMut.isPending ? "Đang chạy..." : "Run maintenance"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={!canRun || runMut.isPending || syncMut.isPending}
                onClick={() => {
                  setFlash(null);
                  syncMut.mutate(
                    {
                      branchId: bid,
                      lockAheadMinutes,
                      noShowGraceMinutes,
                      sessionStaleMinutes,
                    },
                    {
                      onSuccess: (out: MaintenanceResult) => {
                        setLastOutput(out);
                        setFlash({
                          kind: "success",
                          message: "Sync table status thành công.",
                        });
                      },
                      onError: (error: unknown) => {
                        setFlash({
                          kind: "error",
                          message: extractErrorMessage(error),
                        });
                      },
                    },
                  );
                }}
              >
                {syncMut.isPending ? "Đang đồng bộ..." : "Sync table status"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">
              {JSON.stringify(lastOutput ?? { message: "Chưa có output" }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </Can>
    </div>
  );
}