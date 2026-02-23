import { Router } from "express";
import { asyncHandler } from "./asyncHandler.js";
import type { RealtimeSnapshotController } from "../controllers/RealtimeSnapshotController.js";

export function createRealtimeRouter(controller: RealtimeSnapshotController) {
  const r = Router();

  r.get("/snapshot", asyncHandler(controller.getSnapshot));
  r.post("/resync", asyncHandler(controller.resync));

  return r;
}
