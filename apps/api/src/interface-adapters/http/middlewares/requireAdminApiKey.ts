import type { NextFunction, Request, Response } from "express";
import { env } from "../../../infrastructure/config/env.js";

/**
 * Minimal protection for admin endpoints.
 * - If ADMIN_API_KEY is not set, middleware becomes a no-op (dev friendly).
 * - Client sends header: x-admin-api-key: <key>
 */
export function requireAdminApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = env.ADMIN_API_KEY;
  if (!expected) return next();

  const actual = String(req.header("x-admin-api-key") ?? "");
  if (!actual || actual !== expected) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Missing/invalid admin api key" },
      meta: { ts: new Date().toISOString(), requestId: String(res.locals.requestId ?? "") },
    });
  }
  return next();
}
