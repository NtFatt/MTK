import type { NextFunction, Request, Response } from "express";
import { env } from "../../../infrastructure/config/env.js";
import { verifyAdminToken } from "../../../infrastructure/security/token.js";
import { requestContext } from "../../../infrastructure/observability/context.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Preferred: Bearer token
  if (env.ADMIN_TOKEN_SECRET) {
    const auth = String(req.header("authorization") ?? "");
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) throw new Error("INVALID_TOKEN");

    const payload = verifyAdminToken(token, env.ADMIN_TOKEN_SECRET);
    res.locals.admin = {
      adminId: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    // Bind actor info to AsyncLocalStorage for audit/realtime correlation.
    requestContext.setActor({ kind: "admin", id: payload.sub, username: payload.username, role: payload.role });

    return next();
  }

  // Fallback: API key
  const expected = env.ADMIN_API_KEY;
  // If neither Bearer secret nor API key is configured, admin endpoints must NOT be public.
  // Fail fast so misconfig is visible in dev/prod.
  if (!expected) throw new Error("ADMIN_TOKEN_SECRET_MISSING");
  const actual = String(req.header("x-admin-api-key") ?? "");
  if (!actual || actual !== expected) throw new Error("UNAUTHORIZED");

  // We cannot attribute a real actor from API key. Still mark as admin so audit shows "api-key".
  requestContext.setActor({ kind: "admin", id: "api-key", username: "api-key", role: "ADMIN" });

  return next();
}
