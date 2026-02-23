import { normalizeApiError as contractsNormalize } from "@hadilao/contracts";
import type { HttpError } from "./errors";

/**
 * Normalize any thrown error (e.g. from apiFetch) to HttpError.
 * Uses contracts normalizer then maps to app HttpError shape.
 * Does not log token/PII.
 */
export function normalizeApiError(err: unknown): HttpError {
  const normalized = contractsNormalize(err);
  return {
    status: normalized.status ?? 0,
    code: normalized.code,
    message: normalized.message || (normalized.status ? "Request failed" : "Network error"),
    details: normalized.details,
    correlationId: normalized.requestId,
  };
}
