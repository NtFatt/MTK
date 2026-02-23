/**
 * Shared HTTP error type for app-level handling.
 * UI and hooks use this shape; do not log token/PII.
 */
export type HttpError = {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
  correlationId?: string;
};

export function isHttpError(x: unknown): x is HttpError {
  return (
    typeof x === "object" &&
    x !== null &&
    "status" in x &&
    typeof (x as HttpError).status === "number" &&
    "message" in x &&
    typeof (x as HttpError).message === "string"
  );
}
