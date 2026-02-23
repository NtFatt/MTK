import { Cart } from "../../../domain/entities/Cart.js";
import type { OrderChannel } from "../../../domain/entities/Cart.js";

export interface ICartRepository {
  findActiveBySessionId(sessionId: string): Promise<Cart | null>;
  createForSession(sessionId: string, channel: OrderChannel): Promise<Cart>;
  findByCartKey(cartKey: string): Promise<Cart | null>;
  markCheckedOut(cartId: string): Promise<void>;
  markAbandoned(cartId: string): Promise<void>;
}
