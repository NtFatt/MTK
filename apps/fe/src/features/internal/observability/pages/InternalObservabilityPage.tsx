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

import { useObservabilityLogsQuery } from "../hooks/useObservabilityLogsQuery";
import { useObservabilitySlowQueriesQuery } from "../hooks/useObservabilitySlowQueriesQuery";
import type { ObservabilityResult } from "../services/observabilityApi";

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Không thể tải dữ liệu observability.";
}

function toCollection(data: ObservabilityResult): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const candidates = ["items", "data", "logs", "rows", "entries"];

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
}: {
  title: string;
  data: ObservabilityResult;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown | null;
  onRefresh: () => void;
  search: string;
  setSearch: (value: string) => void;
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
            placeholder="level, route, requestId, sql..."
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
            Không có dữ liệu phù hợp.
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

export function InternalObservabilityPage() {
  const session = useStore(authStore, (s) => s.session);
  const { branchId } = useParams<{ branchId: string }>();

  const bid = resolveInternalBranch(session, branchId);
  const branchMismatch = isInternalBranchMismatch(session, branchId);
  const canRead = hasPermission(session, "observability.admin.read");

  const [tab, setTab] = useState("logs");
  const [logsSearch, setLogsSearch] = useState("");
  const [slowSearch, setSlowSearch] = useState("");

  const enabled = !!session && !!bid && !branchMismatch && canRead;

  const logsQuery = useObservabilityLogsQuery(bid, enabled);
  const slowQueriesQuery = useObservabilitySlowQueriesQuery(bid, enabled);

  if (!session) {
    return <Navigate to="/i/login" replace />;
  }

  if (!bid) {
    return <Navigate to="/i/login?reason=missing_branch" replace />;
  }

  if (branchMismatch) {
    return <Navigate to={`/i/${String(session.branchId)}/admin/observability`} replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Can
        perm="observability.admin.read"
        fallback={
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Không đủ quyền truy cập Observability.
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Observability</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Module này đang bám đúng 2 endpoint admin đã có: logs và slow queries.
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="slow-queries">Slow Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <DataBlock
              title="Admin Logs"
              data={logsQuery.data ?? null}
              isLoading={logsQuery.isLoading}
              isFetching={logsQuery.isFetching}
              error={logsQuery.error ?? null}
              onRefresh={() => void logsQuery.refetch()}
              search={logsSearch}
              setSearch={setLogsSearch}
            />
          </TabsContent>

          <TabsContent value="slow-queries">
            <DataBlock
              title="Slow Queries"
              data={slowQueriesQuery.data ?? null}
              isLoading={slowQueriesQuery.isLoading}
              isFetching={slowQueriesQuery.isFetching}
              error={slowQueriesQuery.error ?? null}
              onRefresh={() => void slowQueriesQuery.refetch()}
              search={slowSearch}
              setSearch={setSlowSearch}
            />
          </TabsContent>
        </Tabs>
      </Can>
    </div>
  );
}