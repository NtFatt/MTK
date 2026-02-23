import type { DomainEvent, DomainEventHandler } from "./DomainEvent.js";

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(handler: DomainEventHandler): () => void;
}
