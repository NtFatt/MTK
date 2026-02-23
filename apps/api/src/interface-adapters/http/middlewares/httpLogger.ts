import type { NextFunction, Request, Response } from "express";
import { log } from "../../../infrastructure/observability/logger.js";
import { decHttpInFlight, incHttpInFlight, observeHttp } from "../../../infrastructure/observability/metrics.js";

function resolveRoute(req: Request): string | undefined {
  // Best-effort route normalization:
  // - For matched routes: baseUrl + route.path
  // - Fallback: req.originalUrl (includes query) or req.path
  try {
    const r: any = (req as any).route;
    const baseUrl = String((req as any).baseUrl ?? "");
    const path = r?.path;
    if (typeof path === "string") return `${baseUrl}${path}`;
    return req.path || req.originalUrl || req.url;
  } catch {
    return req.originalUrl || req.url;
  }
}

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  incHttpInFlight();

  const onFinish = () => {
    res.removeListener("finish", onFinish);
    res.removeListener("close", onFinish);

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const status = res.statusCode;

    decHttpInFlight();

    const route = resolveRoute(req);

    observeHttp(req.method, status, durationMs, route);

    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    (log as any)[level]("http", {
      method: req.method,
      path: req.originalUrl || req.url,
      route,
      status,
      durationMs: Math.round(durationMs * 1000) / 1000,
      ip: req.ip,
    });
  };

  res.on("finish", onFinish);
  res.on("close", onFinish);
  next();
}
