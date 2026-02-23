import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "../../../interface-adapters/http/routes/index.js";
import { requestId } from "../../../interface-adapters/http/middlewares/requestId.js";
import { httpLogger } from "../../../interface-adapters/http/middlewares/httpLogger.js";
import { errorHandler } from "../../../interface-adapters/http/middlewares/errorHandler.js";
import { env } from "../../config/env.js";
import { metrics } from "../../observability/metrics.js";
import { requireInternal } from "../../../interface-adapters/http/middlewares/requireInternal.js";
import { requirePermission } from "../../../interface-adapters/http/middlewares/requirePermission.js";
import type { RedisClient } from "../../redis/redisClient.js";

import type { IEventBus } from "../../../application/ports/events/IEventBus.js";

export function createApp(opts?: { eventBus?: IEventBus; redis?: RedisClient }): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  // Put requestId BEFORE body parsing so even invalid JSON gets a request id
  app.use(requestId);
  // Structured access logs + metrics
  app.use(httpLogger);
  app.use(express.json({ limit: "1mb" }));

  // Metrics endpoint (Prometheus)
  if (env.METRICS_ENABLED) {
    const handler = (_req: any, res: any) => {
      res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      res.status(200).send(metrics.render());
    };

    if (env.METRICS_REQUIRE_ADMIN) {
      app.get(env.METRICS_PATH, requireInternal, requirePermission("observability.metrics.read"), handler);
    } else {
      app.get(env.METRICS_PATH, handler);
    }
  }

  const routeDeps: { eventBus?: IEventBus; redis?: RedisClient } = {};
  if (opts?.eventBus) routeDeps.eventBus = opts.eventBus;
  if (opts?.redis) routeDeps.redis = opts.redis;

  registerRoutes(app, routeDeps);

  // Uniform JSON 404 (contract-friendly)
  app.use((req: any, res: any) => {
    const requestId = res?.locals?.requestId ?? null;
    res.status(404).json({
      code: "NOT_FOUND",
      message: "Not Found",
      error: { code: "NOT_FOUND", message: "Not Found" },
      meta: { requestId, path: req.originalUrl, method: req.method },
    });
  });

  app.use(errorHandler);
  return app;
}
