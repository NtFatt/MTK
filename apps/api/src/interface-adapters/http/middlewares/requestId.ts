import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { requestContext } from "../../../infrastructure/observability/context.js";

function getClientIp(req: Request): string | undefined {
  const xf = req.header("x-forwarded-for");
  if (xf && xf.trim().length > 0) return xf.split(",")[0]?.trim();
  const realIp = req.header("x-real-ip");
  if (realIp && realIp.trim().length > 0) return realIp.trim();
  return req.ip;
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.trim().length > 0 ? incoming.trim() : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader("x-request-id", id);

  const ip = getClientIp(req);
  const userAgent = req.header("user-agent") ?? undefined;

  // Bind requestId + http info to AsyncLocalStorage so DB logs, realtime audit, async tasks, etc. can correlate.
  const ctx: any = { requestId: id };
  if (ip) ctx.ip = ip;
  if (userAgent) ctx.userAgent = userAgent;

  requestContext.run(ctx, () => next());
}
