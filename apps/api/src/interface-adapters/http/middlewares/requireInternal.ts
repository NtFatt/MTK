import type { NextFunction, Request, Response } from "express";
import { env } from "../../../infrastructure/config/env.js";
import { verifyInternalToken, type InternalRole } from "../../../infrastructure/security/token.js";
import { requestContext } from "../../../infrastructure/observability/context.js";

export type InternalAuthContext = {
  actorType: "ADMIN" | "STAFF";
  userId: string;
  username: string;
  role: InternalRole;
  branchId: string | null;
};

export function requireInternal(req: Request, res: Response, next: NextFunction) {
  if (!env.ADMIN_TOKEN_SECRET) throw new Error("ADMIN_TOKEN_SECRET_MISSING");

  const auth = String(req.header("authorization") ?? "");
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new Error("INVALID_TOKEN");

  const payload = verifyInternalToken(token, env.ADMIN_TOKEN_SECRET);
  const ctx: InternalAuthContext = {
    actorType: payload.actorType,
    userId: payload.sub,
    username: payload.username,
    role: payload.role,
    branchId: payload.branchId !== undefined ? (payload.branchId === null ? null : String(payload.branchId)) : null,
  };

  (res.locals as any).internal = ctx;

  // Bind actor info to AsyncLocalStorage for audit/realtime correlation.
  if (ctx.actorType === "ADMIN") {
    requestContext.setActor({ kind: "admin", id: ctx.userId, username: ctx.username, role: ctx.role });
  } else {
    requestContext.setActor({ kind: "staff", id: ctx.userId, username: ctx.username, role: ctx.role, branchId: ctx.branchId });
  }

  return next();
}
