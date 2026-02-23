import type { Request, Response } from "express";
import { z } from "zod";

import type { ICartRepository } from "../../../application/ports/repositories/ICartRepository.js";
import type { IOrderRepository } from "../../../application/ports/repositories/IOrderRepository.js";
import type { ITableRepository } from "../../../application/ports/repositories/ITableRepository.js";
import type { ITableSessionRepository } from "../../../application/ports/repositories/ITableSessionRepository.js";

import type { ListBranchTables } from "../../../application/use-cases/admin/ops/ListBranchTables.js";
import type { OpenTableSession } from "../../../application/use-cases/table/OpenTableSession.js";
import type { CloseTableSession } from "../../../application/use-cases/table/CloseTableSession.js";
import type { GetOrCreateCartForSession } from "../../../application/use-cases/cart/GetOrCreateCartForSession.js";
import type { GetCartDetail } from "../../../application/use-cases/cart/GetCartDetail.js";
import type { UpsertCartItem } from "../../../application/use-cases/cart/UpsertCartItem.js";
import type { RemoveCartItem } from "../../../application/use-cases/cart/RemoveCartItem.js";
import type { CreateOrderFromCart } from "../../../application/use-cases/order/CreateOrderFromCart.js";

const QuerySchema = z.object({
  branchId: z.union([z.string().min(1), z.number().int().positive()]).optional().transform((v) => (v === undefined ? undefined : String(v))),
  limit: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : Number(v))),
});

const OpenSessionBody = z
  .object({
    directionId: z.string().trim().min(1).optional(),
    tableId: z.string().trim().min(1).optional(),
  })
  .refine((v) => Boolean(v.directionId || v.tableId), { message: "INVALID_DIRECTION_ID" });

const UpsertItemBody = z.object({
  itemId: z.string().trim().min(1),
  qty: z.union([z.number().int().min(0), z.string()]).transform((v) => Number(v)).refine((n) => Number.isFinite(n) && n >= 0, {
    message: "INVALID_QTY",
  }),
});

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

export class AdminOpsController {
  constructor(
    private readonly listTablesUc: ListBranchTables,
    private readonly tableRepo: ITableRepository,
    private readonly sessionRepo: ITableSessionRepository,
    private readonly cartRepo: ICartRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly openSessionUc: OpenTableSession,
    private readonly closeSessionUc: CloseTableSession,
    private readonly getOrCreateCartUc: GetOrCreateCartForSession,
    private readonly getCartDetailUc: GetCartDetail,
    private readonly upsertCartItemUc: UpsertCartItem,
    private readonly removeCartItemUc: RemoveCartItem,
    private readonly createOrderFromCartUc: CreateOrderFromCart,
  ) {}

  private actorFrom(res: Response) {
    const internal = (res.locals as any).internal;
    if (!internal) throw new Error("INVALID_TOKEN");
    return {
      actorType: internal.actorType as "ADMIN" | "STAFF",
      role: String(internal.role ?? ""),
      branchId: internal.branchId !== undefined && internal.branchId !== null ? String(internal.branchId) : null,
      userId: String(internal.userId ?? internal.sub ?? ""),
      username: String(internal.username ?? ""),
    };
  }

  private async assertBranchScope(
    actor: { actorType: "ADMIN" | "STAFF"; branchId: string | null },
    targetBranchId: string,
  ) {
    if (actor.actorType === "STAFF") {
      if (!actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
      if (String(actor.branchId) !== String(targetBranchId)) throw new Error("FORBIDDEN");
    }
  }

  listTables = async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);
    const actor = this.actorFrom(res);

    const items = await this.listTablesUc.execute({
      actor,
      branchId: q.branchId ?? null,
      limit: q.limit ?? null,
    });

    return res.json({ items });
  };

  openSession = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const body = OpenSessionBody.parse(req.body ?? {});

    // Resolve table for branch-scope enforcement
    const table = body.tableId
      ? await this.tableRepo.findById(body.tableId)
      : body.directionId
        ? await this.tableRepo.findByDirectionId(body.directionId)
        : null;
    if (!table) throw new Error("TABLE_NOT_FOUND");

    await this.assertBranchScope(actor, String(table.branchId));

    const out = await this.openSessionUc.execute({
      tableId: body.tableId || undefined,
      directionId: body.directionId || undefined,
    });

    return res.status(out.created ? 201 : 200).json({
      ...out,
      sessionKey: (out as any)?.session?.sessionKey ?? null,
      sessionId: (out as any)?.session?.id !== undefined ? String((out as any).session.id) : null,
    });
  };

  closeSession = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const sessionKey = mustString(req.params?.sessionKey as unknown, "SESSION_KEY");

    const s = await this.sessionRepo.findBySessionKey(sessionKey);
    if (!s) throw new Error("SESSION_NOT_FOUND");

    const table = await this.tableRepo.findById(s.tableId);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    await this.assertBranchScope(actor, String(table.branchId));

    const out = await this.closeSessionUc.execute(sessionKey);
    if (!out) throw new Error("SESSION_NOT_FOUND");

    return res.json({
      sessionKey: out.session.sessionKey,
      sessionId: String(out.session.id),
      tableId: out.session.tableId,
      status: out.session.status,
      tableStatus: out.tableStatus,
    });
  };

  getOrCreateCartBySession = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const sessionKey = mustString(req.params?.sessionKey as unknown, "SESSION_KEY");

    const s = await this.sessionRepo.findBySessionKey(sessionKey);
    if (!s) throw new Error("SESSION_NOT_FOUND");

    const table = await this.tableRepo.findById(s.tableId);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    await this.assertBranchScope(actor, String(table.branchId));

    const out = await this.getOrCreateCartUc.execute(sessionKey);
    return res.json({
      cartKey: out.cartKey,
      sessionKey,
      tableId: s.tableId,
      branchId: String(table.branchId),
      created: out.created,
    });
  };

  getCartDetail = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const cartKey = mustString(req.params?.cartKey as unknown, "CART_KEY");

    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    await this.assertBranchScope(actor, String(cart.branchId));

    const detail = await this.getCartDetailUc.execute(cartKey);
    return res.json(detail);
  };

  upsertCartItem = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const cartKey = mustString(req.params?.cartKey as unknown, "CART_KEY");
    const body = UpsertItemBody.parse(req.body ?? {});

    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    await this.assertBranchScope(actor, String(cart.branchId));

    await this.upsertCartItemUc.execute(cartKey, body.itemId, body.qty);
    return res.status(204).send();
  };

  removeCartItem = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const cartKey = mustString(req.params?.cartKey as unknown, "CART_KEY");
    const itemId = mustString(req.params?.itemId as unknown, "ITEM_ID");

    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    await this.assertBranchScope(actor, String(cart.branchId));

    await this.removeCartItemUc.execute(cartKey, itemId);
    return res.status(204).send();
  };

  createOrderFromCart = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const cartKey = mustString(req.params?.cartKey as unknown, "CART_KEY");

    const cart = await this.cartRepo.findByCartKey(cartKey);
    if (!cart) throw new Error("CART_NOT_FOUND");
    await this.assertBranchScope(actor, String(cart.branchId));

    const order = await this.createOrderFromCartUc.execute(cartKey);
    return res.status(201).json(order);
  };

  getOrderStatus = async (req: Request, res: Response) => {
    const actor = this.actorFrom(res);
    const orderCode = mustString(req.params?.orderCode as unknown, "ORDER_CODE");

    // Anti-existence-leak rule (NEG-03): STAFF tokens must not reveal whether an order exists in another branch.
    const scope = actor.actorType === "STAFF"
      ? (() => {
          if (!actor.branchId) throw new Error("BRANCH_SCOPE_REQUIRED");
          return this.orderRepo.getRealtimeScopeByOrderCodeForBranch(orderCode, actor.branchId);
        })()
      : this.orderRepo.getRealtimeScopeByOrderCode(orderCode);

    const resolvedScope = await scope;
    if (!resolvedScope) throw new Error(actor.actorType === "STAFF" ? "FORBIDDEN" : "ORDER_NOT_FOUND");

    const status = actor.actorType === "STAFF"
      ? await this.orderRepo.findStatusByOrderCodeForBranch(orderCode, String(actor.branchId))
      : await this.orderRepo.findStatusByOrderCode(orderCode);

    if (!status) throw new Error(actor.actorType === "STAFF" ? "FORBIDDEN" : "ORDER_NOT_FOUND");

    return res.json({ orderCode, status: status.orderStatus });
  };
}
