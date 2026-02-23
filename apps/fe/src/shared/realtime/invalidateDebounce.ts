import type { QueryClient } from "@tanstack/react-query";

export type InvalidateRequest = {
  // Query key prefix (exact=false) or full key (exact=true)
  queryKey: readonly unknown[];
  exact?: boolean;
};

export function createInvalidateDebouncer(
  queryClient: QueryClient,
  debounceMs: number
) {
  const pending = new Map<string, InvalidateRequest>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function keyOf(req: InvalidateRequest) {
    return JSON.stringify({ k: req.queryKey, e: req.exact ?? false });
  }

  function flush() {
    timer = null;
    const items = Array.from(pending.values());
    pending.clear();

    for (const req of items) {
      queryClient.invalidateQueries({
        queryKey: req.queryKey as any,
        exact: req.exact ?? false,
      });
    }
  }

  function enqueue(req: InvalidateRequest) {
    pending.set(keyOf(req), req);
    if (timer) return;
    timer = setTimeout(flush, debounceMs);
  }

  return {
    enqueue,
    flush,
  };
}
