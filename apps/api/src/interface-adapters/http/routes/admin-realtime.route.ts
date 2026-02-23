import { Router } from "express";
import type { AdminRealtimeController } from "../controllers/AdminRealtimeController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminRealtimeRouter(controller: AdminRealtimeController) {
  const r = Router();
  r.use(requireInternal);
  r.use(requirePermission("realtime.admin"));

  // List admin realtime audit events
  // GET /api/v1/admin/realtime/audit?limit=100&room=admin
  r.get("/realtime/audit", asyncHandler(controller.listAudit));

  // Replay admin realtime events (ascending by seq)
  // GET /api/v1/admin/realtime/replay?room=admin&fromSeq=1&limit=200
  r.get("/realtime/replay", asyncHandler(controller.replay));

  return r;
}
