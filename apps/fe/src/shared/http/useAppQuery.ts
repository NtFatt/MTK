import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { normalizeApiError } from "./normalizeApiError";
import type { HttpError } from "./errors";

type AppQueryError = HttpError;

function defaultRetry(failureCount: number, error: unknown): boolean {
  const status = typeof (error as { status?: number })?.status === "number"
    ? (error as { status: number }).status
    : 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
}

export type UseAppQueryOptions<
  TQueryFnData = unknown,
  TError = AppQueryError,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
> = Omit<
  UseQueryOptions<TQueryFnData, unknown, TData, TQueryKey>,
  "retry" | "refetchOnWindowFocus" | "error"
> & {
  retry?: boolean | number | ((failureCount: number, error: unknown) => boolean);
  refetchOnWindowFocus?: boolean;
};

export type UseAppQueryResult<
  TData = unknown,
  TError = AppQueryError,
> = Omit<UseQueryResult<TData, unknown>, "error"> & {
  error: TError | null;
};

export function useAppQuery<
  TQueryFnData = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseAppQueryOptions<TQueryFnData, AppQueryError, TData, TQueryKey>,
): UseAppQueryResult<TData, AppQueryError> {
  const result = useQuery({
    ...options,
    retry: options.retry ?? defaultRetry,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
  });

  const error: AppQueryError | null =
    result.error != null ? normalizeApiError(result.error) : null;

  return {
    ...result,
    error,
  };
}
