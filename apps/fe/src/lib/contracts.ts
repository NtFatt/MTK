/**
 * Re-export contracts (single import path for FE).
 *
 * Quy tắc:
 * - Query keys: dùng `qk.*`
 * - Error normalize: dùng `normalizeApiError()`
 * - Zod schemas: dùng `Schemas.*`
 */

export { qk, normalizeApiError, Schemas } from "@hadilao/contracts";
