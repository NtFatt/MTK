import { useMemo, useState } from "react";
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
import { Skeleton } from "../../../../shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";

import { useRealtimeAuditQuery } from "../hooks/useRealtimeAuditQuery";
import { useRealtimeReplayQuery } from "../hooks/useRealtimeReplayQuery";
import type {
  RealtimeAdminResult,
  RealtimeReplayInput,
} from "../services/realtimeAdminApi";

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Không thể tải dữ liệu realtime admin.";
}

function toCollection(data: RealtimeAdminResult): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const candidates = ["items", "data", "events", "rows", "entries"];

    for (const key of candidates) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter(
          (item): item is Record<string, unknown> => !!item && typeof item === "object",
        );
      }
    }

    return [obj];
  }

  return [];
}

function stringifyRecord(record: Record<string, unknown>): string {
  try {
    return JSON.stringify(record).toLowerCase();
  } catch {
    return "";
  }
}

function DataBlock({
  title,
  data,
  isLoading,
  isFetching,
  error,
  onRefresh,
  search,
  setSearch,
  emptyMessage,
}: {
  title: string;
  data: RealtimeAdminResult;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown | null;
  onRefresh: () => void;
  search: string;
  setSearch: (value: string) => void;
  emptyMessage: string;
}) {
  const items = useMemo(() => toCollection(data), [data]);
  const normalizedSearch = search.trim().toLowerCase();
  const errorMessage = error ? extractErrorMessage(error) : "";

  const filtered = useMemo(() => {
    if (!normalizedSearch) return items;
    return items.filter((item) => stringifyRecord(item).includes(normalizedSearch));
  }, [items, normalizedSearch]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
        </div>

        <Button type="button" variant="secondary" onClick={onRefresh} disabled={isFetching}>
          {isFetching ? "Đang tải..." : "Refresh"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tìm trong kết quả</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="room, seq, type, order, session..."
          />
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {!isLoading && !!error && (
          <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Tổng: {filtered.length} bản ghi
            </div>

            {filtered.slice(0, 50).map((item, index) => (
              <pre
                key={`${title}-${index}`}
                className="overflow-x-auto rounded-md border bg-muted/20 p-3 text-xs"
              >
                {JSON.stringify(item, null, 2)}
              </pre>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InternalRealtimeAdminPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const bid = resolveInternalBranch(session, branchId);
  const branchMismatch = isInternalBranchMismatch(session, branchId);
  const canRead = hasPermission(session, "realtime.admin");

  const enabled = !!session && !!bid && !branchMismatch && canRead;

  const [tab, setTab] = useState("audit");
  const [auditSearch, setAuditSearch] = useState("");
  const [replaySearch, setReplaySearch] = useState("");

  const [replayRoom, setReplayRoom] = useState("branch:1");
  const [replayFromSeq, setReplayFromSeq] = useState("1");
  const [replayLimit, setReplayLimit] = useState("50");
  const [submittedReplay, setSubmittedReplay] = useState<RealtimeReplayInput | null>(null);

  const auditQuery = useRealtimeAuditQuery(bid, enabled);
  const replayQuery = useRealtimeReplayQuery(bid, submittedReplay, enabled && !!submittedReplay);

  if (!session) {
    return <Navigate to="/i/login" replace />;
  }

  if (!bid) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  if (branchMismatch) {
    return <Navigate to={`/i/${String(session.branchId)}/admin/realtime`} replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Can
        perm="realtime.admin"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền truy cập Realtime Admin.
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Realtime Admin</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Module này dùng 2 endpoint admin: audit và replay.
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="replay">Replay</TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
            <DataBlock
              title="Realtime Audit"
              data={auditQuery.data ?? null}
              isLoading={auditQuery.isLoading}
              isFetching={auditQuery.isFetching}
              error={auditQuery.error ?? null}
              onRefresh={() => void auditQuery.refetch()}
              search={auditSearch}
              setSearch={setAuditSearch}
              emptyMessage="Không có dữ liệu audit realtime."
            />
          </TabsContent>

          <TabsContent value="replay" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Replay Input</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4 md:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault();

                    const room = replayRoom.trim();
                    if (!room) return;

                    setSubmittedReplay({
                      room,
                      fromSeq: Number(replayFromSeq || 1),
                      limit: Number(replayLimit || 50),
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Input
                      value={replayRoom}
                      onChange={(e) => setReplayRoom(e.target.value)}
                      placeholder="branch:1 hoặc order:HDL-1001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>From Seq</Label>
                    <Input
                      type="number"
                      min={1}
                      value={replayFromSeq}
                      onChange={(e) => setReplayFromSeq(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Limit</Label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={replayLimit}
                      onChange={(e) => setReplayLimit(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-3 flex flex-wrap gap-2">
                    <Button type="submit" disabled={!enabled}>
                      Replay
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setReplaySearch("");
                        setSubmittedReplay(null);
                      }}
                    >
                      Reset replay
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <DataBlock
              title="Realtime Replay"
              data={replayQuery.data ?? null}
              isLoading={replayQuery.isLoading}
              isFetching={replayQuery.isFetching}
              error={replayQuery.error ?? null}
              onRefresh={() => {
                if (submittedReplay) {
                  void replayQuery.refetch();
                }
              }}
              search={replaySearch}
              setSearch={setReplaySearch}
              emptyMessage={
                submittedReplay
                  ? "Không có dữ liệu replay phù hợp."
                  : "Nhập room và fromSeq rồi bấm Replay."
              }
            />
          </TabsContent>
        </Tabs>
      </Can>
    </div>
  );
}