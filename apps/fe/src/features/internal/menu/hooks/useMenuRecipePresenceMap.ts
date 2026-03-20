import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMenuRecipe } from "../services/menuRecipesApi";

export type MenuRecipePresenceSummary = {
  status: "ready" | "missing" | "error";
  lineCount: number;
};

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as {
    status?: unknown;
    response?: { status?: unknown };
    cause?: { status?: unknown };
    message?: unknown;
  };

  return (
    Number(maybeError.status) === 404 ||
    Number(maybeError.response?.status) === 404 ||
    Number(maybeError.cause?.status) === 404 ||
    (typeof maybeError.message === "string" &&
      /404|not found|không tìm thấy/i.test(maybeError.message))
  );
}

export function useMenuRecipePresenceMap(branchId: string | null, itemIds: string[]) {
  const normalizedIds = useMemo(() => {
    return Array.from(
      new Set(itemIds.map((itemId) => String(itemId ?? "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "vi"));
  }, [itemIds]);

  return useQuery<Record<string, MenuRecipePresenceSummary>>({
    queryKey: ["menu-recipe-presence", branchId, normalizedIds] as const,
    enabled: Boolean(branchId && normalizedIds.length > 0),
    staleTime: 10_000,
    queryFn: async () => {
      const entries = await Promise.all(
        normalizedIds.map(async (itemId) => {
          try {
            const lines = await fetchMenuRecipe(String(branchId), itemId);

            return [
              itemId,
              {
                status: lines.length > 0 ? "ready" : "missing",
                lineCount: lines.length,
              },
            ] as const;
          } catch (error) {
            if (isNotFoundError(error)) {
              return [
                itemId,
                {
                  status: "missing",
                  lineCount: 0,
                },
              ] as const;
            }

            return [
              itemId,
              {
                status: "error",
                lineCount: 0,
              },
            ] as const;
          }
        }),
      );

      return Object.fromEntries(entries);
    },
  });
}