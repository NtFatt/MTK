/**
 * @hadilao/contracts
 *
 * Mục tiêu: “neo” FE (và Cursor) vào contract ổn định.
 * - queryKeys: chuẩn hoá naming TanStack Query
 * - errors: chuẩn hoá error code + normalize shape
 * - schemas: Zod skeleton để validate/parse response/request (tăng dần độ strict sau khi có OpenAPI)
 */

export * from "./queryKeys";

export * from "./errors/errorCodes";
export * from "./errors/apiError";

export * as Schemas from "./schemas";
