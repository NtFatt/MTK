import type { ITableSessionRepository } from "../../ports/repositories/ITableSessionRepository.js";
import type { ICartRepository } from "../../ports/repositories/ICartRepository.js";

export class GetOrCreateCartForSession {
  constructor(
    private sessionRepo: ITableSessionRepository,
    private cartRepo: ICartRepository
  ) {}

  async execute(sessionKey: string) {
    const session = await this.sessionRepo.findBySessionKey(sessionKey);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.status !== "OPEN") throw new Error("SESSION_CLOSED");

    const existing = await this.cartRepo.findActiveBySessionId(session.id);
    if (existing) return existing;

    return this.cartRepo.createForSession(session.id, "DINE_IN");
  }
}
