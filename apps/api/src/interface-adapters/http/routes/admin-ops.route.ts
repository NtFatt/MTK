import { Router } from "express";
import type { AdminOpsController } from "../controllers/AdminOpsController.js";
import { requireInternal } from "../middlewares/requireInternal.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { asyncHandler } from "./asyncHandler.js";

export function createAdminOpsRouter(ctrl: AdminOpsController) {
  const r = Router();
  r.use(requireInternal);

  // STAFF/BRANCH_MANAGER/ADMIN - branch-scoped by token for STAFF actors.
  r.get("/ops/tables", requirePermission("ops.tables.read"), asyncHandler(ctrl.listTables));

  // Sessions
  r.post("/ops/sessions/open", requirePermission("ops.sessions.open"), asyncHandler(ctrl.openSession));
  r.post(
    "/ops/sessions/:sessionKey/close",
    requirePermission("ops.sessions.close"),
    asyncHandler(ctrl.closeSession),
  );

  // Carts (ops-side)
  r.post(
    "/ops/carts/session/:sessionKey",
    requirePermission("ops.carts.get"),
    asyncHandler(ctrl.getOrCreateCartBySession),
  );
  r.get("/ops/carts/:cartKey", requirePermission("ops.carts.get"), asyncHandler(ctrl.getCartDetail));
  r.put(
    "/ops/carts/:cartKey/items",
    requirePermission("ops.carts.items.upsert"),
    asyncHandler(ctrl.upsertCartItem),
  );
  r.delete(
    "/ops/carts/:cartKey/items/:itemId",
    requirePermission("ops.carts.items.upsert"),
    asyncHandler(ctrl.removeCartItem),
  );

  // Orders
  r.post(
    "/ops/orders/from-cart/:cartKey",
    requirePermission("ops.orders.create"),
    asyncHandler(ctrl.createOrderFromCart),
  );
  r.get(
    "/ops/orders/:orderCode/status",
    requirePermission("ops.tables.read"),
    asyncHandler(ctrl.getOrderStatus),
  );

  return r;
}
