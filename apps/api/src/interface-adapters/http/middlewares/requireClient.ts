import type { NextFunction, Request, Response } from "express";
import { env } from "../../../infrastructure/config/env.js";
import { verifyClientAccessToken } from "../../../infrastructure/security/token.js";
import { requestContext } from "../../../infrastructure/observability/context.js";

export function requireClient(req: Request, res: Response, next: NextFunction) {
  const auth = String(req.headers.authorization ?? "");
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!env.CLIENT_ACCESS_TOKEN_SECRET) return next(new Error("CLIENT_TOKEN_SECRET_MISSING"));
  if (!token) return next(new Error("INVALID_TOKEN"));

  try {
    const payload = verifyClientAccessToken(token, env.CLIENT_ACCESS_TOKEN_SECRET);
    res.locals.client = payload;

    // Bind actor info to AsyncLocalStorage for audit/realtime correlation.
    requestContext.setActor({ kind: "client", id: payload.sub, ...(payload.phone ? { phone: payload.phone } : {}) });

    return next();
  } catch (e: any) {
    return next(new Error(e?.message ?? "INVALID_TOKEN"));
  }
}
