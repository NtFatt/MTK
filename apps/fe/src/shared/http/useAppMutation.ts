import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { normalizeApiError } from "./normalizeApiError";
import type { HttpError } from "./errors";

type AppMutationError = HttpError;

export type UseAppMutationOptions<
  TData = unknown,
  TError = AppMutationError,
  TVariables = void,
  TContext = unknown,
> = Omit<
  UseMutationOptions<TData, unknown, TVariables, TContext>,
  "error"
> & {
  invalidateKeys?: unknown[][];
};

export type UseAppMutationResult<
  TData = unknown,
  TError = AppMutationError,
  TVariables = void,
  TContext = unknown,
> = Omit<UseMutationResult<TData, unknown, TVariables, TContext>, "error"> & {
  error: TError | null;
};

export function useAppMutation<
  TData = unknown,
  TError = AppMutationError,
  TVariables = void,
  TContext = unknown,
>(
  options: UseAppMutationOptions<TData, TError, TVariables, TContext>,
): UseAppMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...options,
    onSettled: (data, err, variables, context, mutationInstance) => {
      if (options.invalidateKeys?.length) {
        for (const queryKey of options.invalidateKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
      options.onSettled?.(data, err, variables, context, mutationInstance);
    },
  });

  const error: AppMutationError | null =
    mutation.error != null ? normalizeApiError(mutation.error) : null;

  return {
    ...mutation,
    error: error as TError | null,
  };
}
