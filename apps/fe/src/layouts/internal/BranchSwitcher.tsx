import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const KEY = "hadilao.admin.recentBranches";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.map(String).filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecent(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, 8)));
  } catch {}
}

function replaceBranch(pathname: string, newBranchId: string) {
  // /i/1/...  -> /i/NEW/...
  if (pathname.startsWith("/i/")) return pathname.replace(/^\/i\/[^/]+/, `/i/${newBranchId}`);
  return `/i/${newBranchId}/admin/dashboard`;
}

export function BranchSwitcher({ branchId }: { branchId: string }) {
  const nav = useNavigate();
  const loc = useLocation();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const recent = useMemo(() => loadRecent(), [open]);

  function go(id: string) {
    const bid = String(id).trim();
    if (!bid) return;

    const nextPath = replaceBranch(loc.pathname, bid);
    const nextRecent = [bid, ...recent.filter((x) => x !== bid)];
    saveRecent(nextRecent);

    setOpen(false);
    setInput("");
    nav(nextPath);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
      >
        Đổi chi nhánh
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[260px] rounded-xl border bg-background p-3 shadow">
          <div className="text-xs text-muted-foreground">Đang ở chi nhánh</div>
          <div className="mb-3 font-mono text-sm">{branchId || "—"}</div>

          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Nhập branchId (vd: 1, 999...)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") go(input);
            }}
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => go(input)}
            >
              Đi
            </button>
          </div>

          {recent.length > 0 && (
            <>
              <div className="mt-3 text-xs text-muted-foreground">Recent</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => go(r)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}