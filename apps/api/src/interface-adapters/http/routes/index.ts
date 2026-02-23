import type { Express } from "express";
import { buildControllers } from "../../../main/di.js";
import type { IEventBus } from "../../../application/ports/events/IEventBus.js";
import type { RedisClient } from "../../../infrastructure/redis/redisClient.js";
import { env } from "../../../infrastructure/config/env.js";

import { createTableRouter } from "./table.route.js";
import { createTableSessionRouter } from "./table-session.route.js";
import { createCartRouter } from "./cart.route.js";
import { createOrderRouter } from "./order.route.js";
import { createAdminOrderRouter } from "./admin-order.route.js";
import { createAdminAuthRouter } from "./admin-auth.route.js";
import { createPaymentRouter } from "./payment.route.js";
import { createReservationRouter } from "./reservation.route.js";
import { createAdminReservationRouter } from "./admin-reservation.route.js";
import { createAdminMaintenanceRouter } from "./admin-maintenance.route.js";
import { createAdminPaymentRouter } from "./admin-payment.route.js";
import { createAdminRealtimeRouter } from "./admin-realtime.route.js";
import { createAdminObservabilityRouter } from "./admin-observability.route.js";
import { createAdminStaffRouter } from "./admin-staff.route.js";
import { createAdminInventoryRouter } from "./admin-inventory.route.js";
import { createAdminOpsRouter } from "./admin-ops.route.js";
import { createAdminKitchenRouter } from "./admin-kitchen.route.js";
import { createAdminCashierRouter } from "./admin-cashier.route.js";
import { createMenuRouter } from "./menu.route.js";
import { createClientAuthRouter } from "./client-auth.route.js";
import { createRealtimeRouter } from "./realtime.route.js";

export function registerRoutes(
  app: Express,
  deps?: { eventBus?: IEventBus; redis?: RedisClient },
) {
  // Inject deps vào buildControllers
  const diDeps: { eventBus?: IEventBus; redis?: RedisClient } = {};
  if (deps?.eventBus) diDeps.eventBus = deps.eventBus;
  if (deps?.redis) diDeps.redis = deps.redis;

  const redis = deps?.redis;

  const {
    tableController,
    tableSessionController,
    cartController,
    orderController,
    adminOrderController,
    adminAuthController,
    adminStaffController,
    adminInventoryController,
    adminOpsController,
    adminKitchenController,
    adminCashierController,
    paymentController,
    reservationController,
    adminReservationController,
    adminMaintenanceController,
    adminObservabilityController,
    adminRealtimeController,
    adminPaymentController,
    realtimeSnapshotController,
    menuController,
    clientAuthController,
  } = buildControllers(diDeps);

  const v1 = "/api/v1";

  app.get(`${v1}/health`, (_req, res) => res.json({ ok: true }));

  // [NEW] Client Auth Routes (OTP Login/Register)
  app.use(`${v1}/client`, createClientAuthRouter(clientAuthController, { redis }));

  // Business Routes
  app.use(`${v1}/tables`, createTableRouter(tableController));
  app.use(`${v1}/sessions`, createTableSessionRouter(tableSessionController));
  app.use(`${v1}/carts`, createCartRouter(cartController));
  app.use(`${v1}/orders`, createOrderRouter(orderController));
  app.use(`${v1}/payments`, createPaymentRouter(paymentController));
  app.use(`${v1}/reservations`, createReservationRouter(reservationController));
  app.use(`${v1}/menu`, createMenuRouter(menuController));
  app.use(`${v1}/realtime`, createRealtimeRouter(realtimeSnapshotController));

  // Admin Routes
  app.use(`${v1}/admin`, createAdminAuthRouter(adminAuthController, { redis }));
  app.use(`${v1}/admin`, createAdminStaffRouter(adminStaffController));
  app.use(`${v1}/admin`, createAdminInventoryRouter(adminInventoryController));
  app.use(`${v1}/admin`, createAdminOpsRouter(adminOpsController));
  app.use(`${v1}/admin`, createAdminKitchenRouter(adminKitchenController));
  app.use(`${v1}/admin`, createAdminCashierRouter(adminCashierController, { redis }));
  app.use(`${v1}/admin`, createAdminOrderRouter(adminOrderController, { legacyEnabled: env.LEGACY_API_ENABLED }));
  app.use(
    `${v1}/admin`,
    createAdminReservationRouter(adminReservationController),
  );
  app.use(
    `${v1}/admin`,
    createAdminMaintenanceRouter(adminMaintenanceController),
  );
  app.use(`${v1}/admin`, createAdminObservabilityRouter(adminObservabilityController));
  app.use(`${v1}/admin`, createAdminRealtimeRouter(adminRealtimeController));
  app.use(`${v1}/admin`, createAdminPaymentRouter(adminPaymentController, { redis }));

  // ===== Legacy paths (deprecated) — behind flag (M0 contract lock) =====
  // Policy:
  // - Keep legacy code for migration strategy.
  // - Default OFF: LEGACY_API_ENABLED=false.
  // - When ON: legacy must map 1-1 to canonical and MUST be marked deprecated.
  if (env.LEGACY_API_ENABLED) {
    const legacyDeprecated = (_req: any, res: any, next: any) => {
      res.setHeader("Deprecation", "true");
      res.setHeader("Warning", '299 - "Deprecated API: use /api/v1/*"');
      return next();
    };

    app.get("/api/health", legacyDeprecated, (_req, res) => res.json({ ok: true, deprecated: true }));

    app.use("/api/auth", legacyDeprecated, createClientAuthRouter(clientAuthController, { redis }));
    app.use("/api/tables", legacyDeprecated, createTableRouter(tableController));
    app.use("/api/sessions", legacyDeprecated, createTableSessionRouter(tableSessionController));
    app.use("/api/carts", legacyDeprecated, createCartRouter(cartController));
    app.use("/api/orders", legacyDeprecated, createOrderRouter(orderController));
    app.use("/api/payments", legacyDeprecated, createPaymentRouter(paymentController));
    app.use("/api/reservations", legacyDeprecated, createReservationRouter(reservationController));
    app.use("/api/menu", legacyDeprecated, createMenuRouter(menuController));
    app.use("/api/realtime", legacyDeprecated, createRealtimeRouter(realtimeSnapshotController));

    app.use("/api/admin", legacyDeprecated, createAdminAuthRouter(adminAuthController, { redis }));
    app.use("/api/admin", legacyDeprecated, createAdminStaffRouter(adminStaffController));
    app.use("/api/admin", legacyDeprecated, createAdminInventoryRouter(adminInventoryController));
    app.use("/api/admin", legacyDeprecated, createAdminOpsRouter(adminOpsController));
    app.use("/api/admin", legacyDeprecated, createAdminKitchenRouter(adminKitchenController));
    app.use("/api/admin", legacyDeprecated, createAdminCashierRouter(adminCashierController, { redis }));
    app.use("/api/admin", legacyDeprecated, createAdminOrderRouter(adminOrderController, { legacyEnabled: true }));
    app.use("/api/admin", legacyDeprecated, createAdminReservationRouter(adminReservationController));
    app.use("/api/admin", legacyDeprecated, createAdminMaintenanceRouter(adminMaintenanceController));
    app.use("/api/admin", legacyDeprecated, createAdminObservabilityRouter(adminObservabilityController));
    app.use("/api/admin", legacyDeprecated, createAdminRealtimeRouter(adminRealtimeController));
    app.use("/api/admin", legacyDeprecated, createAdminPaymentRouter(adminPaymentController, { redis }));
  }
}
