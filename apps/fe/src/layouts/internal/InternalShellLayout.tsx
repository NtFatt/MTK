import { Outlet, useMatches, useParams } from "react-router-dom";
import { InternalTopbar } from "./InternalTopbar";
import { InternalShellNav } from "./InternalShellNav";

export function InternalShellLayout() {
  const { branchId } = useParams<{ branchId: string }>();
  const matches = useMatches();

  const title =
    [...matches].reverse().find((m) => (m.handle as any)?.title)?.handle?.title ?? "";

  return (
    <div className="min-h-screen bg-background">
      <InternalTopbar branchId={branchId ?? ""} />

      <main className="px-6 py-6">
        {/* ✅ header cố định: đi đâu cũng có */}
        {title && (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Chi nhánh: <span className="font-mono">{branchId ?? "—"}</span>
              </p>
            </div>

            <InternalShellNav
              rightSlot={
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
                  onClick={() => window.dispatchEvent(new CustomEvent("internal.refresh"))}
                >
                  Refresh
                </button>
              }
            />
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}