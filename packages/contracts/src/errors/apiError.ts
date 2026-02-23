import { appErrorCodeFromStatus, defaultUserMessageByAppCode, type AppErrorCode } from "./errorCodes";

/**
 * ApiErrorNormalized
 *
 * FE chỉ nên xử lý 1 format này.
 */
export type ApiErrorNormalized = {
  status?: number;
  /**
   * code: có thể là domain code (VD: NO_TABLE_AVAILABLE/OUT_OF_STOCK/BRANCH_MISMATCH)
   * hoặc appCode fallback nếu BE không gửi.
   */
  code?: string;
  appCode: AppErrorCode;
  message: string;
  /** message dành cho UI (đã fallback) */
  userMessage: string;
  requestId?: string;
  retryAfterMs?: number;
  details?: unknown;
  isNetworkError: boolean;
  raw?: unknown;
};

/**
 * Thử lấy status từ các lỗi phổ biến (fetch/axios/ky).
 */
const tryGetStatus = (err: any): number | undefined => {
  return (
    err?.response?.status ??
    err?.status ??
    err?.statusCode ??
    err?.cause?.status ??
    undefined
  );
};

const tryGetHeaders = (err: any): Record<string, string> | undefined => {
  const h = err?.response?.headers;
  if (!h) return undefined;
  if (typeof h.get === "function") {
    // Fetch Headers
    const retryAfter = h.get("retry-after");
    return retryAfter ? { "retry-after": retryAfter } : {};
  }
  // Axios headers object
  return h;
};

/**
 * Nhận diện payload error phổ biến.
 *
 * Chấp nhận các shape:
 * - { code, message, details?, requestId? }
 * - { error: { code, message, details? }, meta: { requestId } }
 * - { message }
 */
const parseErrorPayload = (payload: any): { code?: string; message?: string; details?: unknown; requestId?: string } => {
  if (!payload || typeof payload !== "object") return {};

  const direct = {
    code: typeof payload.code === "string" ? payload.code : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
    details: payload.details ?? payload.errors ?? payload.data ?? undefined,
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
  };

  const nested = payload.error && typeof payload.error === "object"
    ? {
        code: typeof payload.error.code === "string" ? payload.error.code : undefined,
        message: typeof payload.error.message === "string" ? payload.error.message : undefined,
        details: payload.error.details ?? payload.error.errors ?? undefined,
      }
    : {};

  const metaReqId = payload.meta && typeof payload.meta === "object" && typeof payload.meta.requestId === "string"
    ? payload.meta.requestId
    : undefined;

  return {
    code: direct.code ?? (nested as any).code,
    message: direct.message ?? (nested as any).message,
    details: direct.details ?? (nested as any).details,
    requestId: direct.requestId ?? metaReqId,
  };
};

const isNetworkLike = (err: any) => {
  // fetch: TypeError: Failed to fetch
  // axios: err.code === 'ERR_NETWORK'
  return (
    err?.code === "ERR_NETWORK" ||
    err?.name === "TypeError" ||
    String(err?.message ?? "").toLowerCase().includes("network") ||
    String(err?.message ?? "").toLowerCase().includes("failed to fetch")
  );
};

export const normalizeApiError = (err: unknown): ApiErrorNormalized => {
  const e: any = err;
  const status = tryGetStatus(e);
  const headers = tryGetHeaders(e);

  // axios-like
  const payload = e?.response?.data ?? e?.data ?? e?.body ?? undefined;
  const parsed = parseErrorPayload(payload);

  const appCode = isNetworkLike(e) ? ("NETWORK_ERROR" as const) : appErrorCodeFromStatus(status);

  const retryAfterSecRaw = headers?.["retry-after"] ?? headers?.["Retry-After"]; // axios may preserve casing
  const retryAfterMs = retryAfterSecRaw
    ? Number(retryAfterSecRaw) * 1000
    : undefined;

  const message =
    parsed.message ??
    (typeof e?.message === "string" ? e.message : undefined) ??
    defaultUserMessageByAppCode[appCode];

  const userMessage = defaultUserMessageByAppCode[appCode];

  return {
    status,
    code: parsed.code,
    appCode,
    message,
    userMessage,
    requestId: parsed.requestId,
    retryAfterMs,
    details: parsed.details,
    isNetworkError: appCode === "NETWORK_ERROR",
    raw: err,
  };
};
