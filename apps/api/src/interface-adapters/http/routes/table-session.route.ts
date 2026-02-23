import { Router } from "express";
import type { TableSessionController } from "../controllers/TableSessionController.js";
import { asyncHandler } from "./asyncHandler.js";

export function createTableSessionRouter(controller: TableSessionController) {
  const router = Router();

  router.post("/open", asyncHandler(controller.open));
  router.post("/:sessionKey/close", asyncHandler(controller.close));

  return router;
}
