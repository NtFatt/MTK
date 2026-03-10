import { Outlet, useMatches, useParams } from "react-router-dom";
import { InternalTopbar } from "./InternalTopbar";
import { InternalShellNav } from "./InternalShellNav";

type RouteHandle = {
  title?: string;
};

export function InternalShellLayout() {
  const { branchId } = useParams<{ branchId: string }>();
  const matches = useMatches();

  let title = "";
  for (const m of [...matches].reverse()) {
    const handle = m.handle as RouteHandle | undefined;
    if (handle?.title) {
      title = handle.title;
      break;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <InternalTopbar branchId={branchId ?? ""} />

      <main className="space-y-6 px-6 py-6">
        {title && (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Chi nhánh: <span className="font-mono">{branchId ?? "—"}</span>
              </p>
            </div>

            <div className="xl:flex-shrink-0">
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
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}