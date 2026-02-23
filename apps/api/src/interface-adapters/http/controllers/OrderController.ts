import type { Request, Response } from "express";
import type { CreateOrderFromCart } from "../../../application/use-cases/order/CreateOrderFromCart.js";
import type { IOrderRepository } from "../../../application/ports/repositories/IOrderRepository.js";

function mustString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`INVALID_${field}`);
  return v.trim();
}

export class OrderController {
  constructor(
    private createFromCart: CreateOrderFromCart,
    private orderRepo: IOrderRepository,
  ) {}

  createFromCartHandler = async (req: Request, res: Response) => {
    const cartKey = mustString(req.params.cartKey as unknown, "CART_KEY");
    const note = typeof req.body?.note === "string" ? req.body.note : null;

    const out = await this.createFromCart.execute(cartKey, note);
    return res.status(201).json(out);
  };

  getStatus = async (req: Request, res: Response) => {
    const orderCode = mustString(req.params.orderCode as unknown, "ORDER_CODE");

    const data = await this.orderRepo.findStatusByOrderCode(orderCode);
    if (!data) throw new Error("ORDER_NOT_FOUND");

    return res.json(data);
  };
}
