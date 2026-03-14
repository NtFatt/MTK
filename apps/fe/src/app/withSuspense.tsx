import { Suspense, type ReactNode } from "react";
import { RouteLoadingPage } from "./RouteLoadingPage";

export function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteLoadingPage />}>{node}</Suspense>;
}