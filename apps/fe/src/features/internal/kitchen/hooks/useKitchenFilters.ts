import { useEffect, useState } from "react";
import type { KitchenStage } from "../utils/kitchenStatus";

export type KitchenViewMode = "board" | "list";
export type KitchenDensity = "comfortable" | "compact";

type KitchenFilterState = {
  query: string;
  stage: KitchenStage;
  viewMode: KitchenViewMode;
  density: KitchenDensity;
  onlyOverdue: boolean;
  onlyMissingRecipe: boolean;
};

const STORAGE_KEY = "kitchen:filters:v2";

function readInitialState(): KitchenFilterState {
  if (typeof window === "undefined") {
    return {
      query: "",
      stage: "ALL",
      viewMode: "board",
      density: "comfortable",
      onlyOverdue: false,
      onlyMissingRecipe: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("missing");
    const parsed = JSON.parse(raw) as Partial<KitchenFilterState>;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      stage:
        parsed.stage === "NEW" ||
        parsed.stage === "RECEIVED" ||
        parsed.stage === "PREPARING" ||
        parsed.stage === "READY" ||
        parsed.stage === "ALL"
          ? parsed.stage
          : "ALL",
      viewMode: parsed.viewMode === "list" ? "list" : "board",
      density: parsed.density === "compact" ? "compact" : "comfortable",
      onlyOverdue: Boolean(parsed.onlyOverdue),
      onlyMissingRecipe: Boolean(parsed.onlyMissingRecipe),
    };
  } catch {
    return {
      query: "",
      stage: "ALL",
      viewMode: "board",
      density: "comfortable",
      onlyOverdue: false,
      onlyMissingRecipe: false,
    };
  }
}

export function useKitchenFilters() {
  const [state, setState] = useState<KitchenFilterState>(() => readInitialState());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  return {
    ...state,
    setQuery: (query: string) => setState((prev) => ({ ...prev, query })),
    setStage: (stage: KitchenStage) => setState((prev) => ({ ...prev, stage })),
    setViewMode: (viewMode: KitchenViewMode) => setState((prev) => ({ ...prev, viewMode })),
    setDensity: (density: KitchenDensity) => setState((prev) => ({ ...prev, density })),
    toggleOnlyOverdue: () =>
      setState((prev) => ({ ...prev, onlyOverdue: !prev.onlyOverdue })),
    toggleOnlyMissingRecipe: () =>
      setState((prev) => ({ ...prev, onlyMissingRecipe: !prev.onlyMissingRecipe })),
    resetFilters: () =>
      setState((prev) => ({
        ...prev,
        query: "",
        stage: "ALL",
        onlyOverdue: false,
        onlyMissingRecipe: false,
      })),
  };
}
