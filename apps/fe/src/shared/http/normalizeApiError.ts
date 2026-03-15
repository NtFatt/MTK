import { normalizeApiError as contractsNormalize } from "@hadilao/contracts";
import type { HttpError } from "./errors";

function mapAppErrorMessage(code?: string, fallback?: string) {
  switch (code) {
    case "STAFF_USERNAME_ALREADY_EXISTS":
      return "Username đã tồn tại. Vui lòng chọn username khác.";
    default:
      return fallback;
  }
}

/**
 * Normalize any thrown error (e.g. from apiFetch) to HttpError.
 * Uses contracts normalizer then maps to app HttpError shape.
 * Does not log token/PII.
 */
export function normalizeApiError(err: unknown): HttpError {
  const normalized = contractsNormalize(err);

  const fallbackMessage =
    normalized.message || (normalized.status ? "Request failed" : "Network error");

  return {
    status: normalized.status ?? 0,
    code: normalized.code,
    message: mapAppErrorMessage(normalized.code, fallbackMessage) ?? fallbackMessage,
    details: normalized.details,
    correlationId: normalized.requestId,
  };
}