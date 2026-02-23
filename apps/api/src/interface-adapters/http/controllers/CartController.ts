import type { Request, Response } from "express";
import type { GetOrCreateCartForSession } from "../../../application/use-cases/cart/GetOrCreateCartForSession.js";
import type { GetCartDetail } from "../../../application/use-cases/cart/GetCartDetail.js";
import type { UpsertCartItem } from "../../../application/use-cases/cart/UpsertCartItem.js";
import type { RemoveCartItem } from "../../../application/use-cases/cart/RemoveCartItem.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

function mustId(v: unknown, field: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  throw new Error(`INVALID_${field}`);
}

function mustInt(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isInteger(v)) throw new Error(`INVALID_${field}`);
  return v;
}

export class CartController {
  constructor(
    private getOrCreate: GetOrCreateCartForSession,
    private getDetail: GetCartDetail,
    private upsertItem: UpsertCartItem,
    private removeItem: RemoveCartItem,
  ) {}

  openForSession = async (req: Request, res: Response) => {
    const sessionKey = mustString(req.params.sessionKey as unknown, "SESSION_KEY");
    const cart = await this.getOrCreate.execute(sessionKey);
    return res.json({ cartKey: cart.cartKey, cartStatus: cart.status });
  };

  getByCartKey = async (req: Request, res: Response) => {
    const cartKey = mustString(req.params.cartKey as unknown, "CART_KEY");
    const data = await this.getDetail.execute(cartKey);
    return res.json(data);
  };

  upsertCartItem = async (req: Request, res: Response) => {
    const cartKey = mustString(req.params.cartKey as unknown, "CART_KEY");
    const itemId = mustId(req.body?.itemId, "ITEM_ID");
    const quantity = mustInt(req.body?.quantity, "QUANTITY");
    const itemOptions = req.body?.itemOptions; // optional JSON

    await this.upsertItem.execute(cartKey, itemId, quantity, itemOptions);
    return res.status(204).send();
  };

  removeCartItem = async (req: Request, res: Response) => {
    const cartKey = mustString(req.params.cartKey as unknown, "CART_KEY");
    const itemId = mustString(req.params.itemId as unknown, "ITEM_ID");

    const q = req.query?.optionsHash;
    const optionsHash = typeof q === "string" ? q.trim() : undefined;

    await this.removeItem.execute(cartKey, itemId, optionsHash);
    return res.status(204).send();
  };
}
