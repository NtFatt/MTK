import type { IEventBus } from "./IEventBus.js";
import type { DomainEvent, DomainEventHandler } from "./DomainEvent.js";

export class NoopEventBus implements IEventBus {
  async publish(_event: DomainEvent): Promise<void> {
    // no-op
  }

  subscribe(_handler: DomainEventHandler): () => void {
    return () => {};
  }
}
